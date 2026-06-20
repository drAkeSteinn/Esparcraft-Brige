// ============================================
// ADAPTER GROK (xAI) - Extiende OpenAI (formato compatible)
// - Endpoint: {apiUrl}/chat/completions (igual que OpenAI)
// - Modelos actuales (21/06/2026):
//     grok-4.3, grok-4.3-latest          (frontier, 1M ctx, reasoning)
//     grok-4.20-multi-agent-0309          (multi-agente, 1M ctx)
//     grok-4.20-0309-reasoning            (reasoning, 1M ctx)
//     grok-4.20-0309-non-reasoning        (no reasoning, 1M ctx)
//     grok-build-0.1                      (coding, 256K ctx)
// - Modelos retirados el 15/05/2026 (redirigen a grok-4.3):
//     grok-3, grok-3-reasoning, grok-4, grok-4-1-fast-*
// - Requiere API key (header Authorization: Bearer <key>)
//
// Referencias oficiales de xAI:
//   - Function Calling: https://docs.x.ai/developers/tools/function-calling
//   - Structured Outputs: https://docs.x.ai/developers/model-capabilities/text/structured-outputs
//   - Reasoning: https://docs.x.ai/developers/model-capabilities/text/reasoning
//   - Models: https://docs.x.ai/developers/models
//
// Reglas clave de la API de xAI (extraídas de la doc oficial):
//   1. tools[].function.parameters debe ser un JSON Schema con type:"object"
//      en la raíz. Schemas con raíz scalar/array son rechazados con 400.
//   2. xAI SIEMPRE usa strict mode para tool calling (el flag `strict` es
//      implícitamente true). Los argumentos que genere el LLM van a cumplir
//      el schema.
//   3. tool_choice: "auto" (default) | "required" | "none" |
//      {"type":"function","function":{"name":"..."}}.
//   4. parallel_tool_calls: true por defecto. Pasar false para deshabilitar.
//   5. additionalProperties es false por defecto (debe ser true explícito).
//   6. Máximo 200 tools por request.
//   7. reasoning_effort: none | low (default) | medium | high. Solo aplica
//      a modelos que lo soportan (grok-4.3, grok-4.20-0309-reasoning).
//      Cuando reasoning_effort != none, NO enviar temperature (xAI la
//      ajusta internamente según el effort).
//   8. Grok soporta role "system" nativamente (no como OpenAI o1/o3 que
//      lo rechazan). NO convertimos system → user.
// ============================================

import { OpenAIAdapter } from './openai';
import {
  LLMProviderConfig,
  LLMMessage,
  LLMCallResult,
  ToolDefinition,
  ToolCall,
  TokenUsage,
  PROVIDERS,
} from '../types';

/** Modelos de xAI que soportan el parámetro reasoning_effort. */
const GROK_REASONING_MODELS = new Set<string>(
  PROVIDERS.grok.reasoningModels ?? []
);

/** Máximo número de tools por request (límite de xAI). */
const XAI_MAX_TOOLS = 200;

/**
 * Devuelve true si el modelo configurado soporta `reasoning_effort`.
 * Esto evita enviar el parámetro a modelos que no lo entienden
 * (grok-4.20-non-reasoning, grok-build-0.1, etc.) y harían fallar la request.
 */
function modelSupportsReasoning(model: string): boolean {
  // Coincidencia exacta o por prefijo (ej: "grok-4.3-anything" → soporta)
  if (GROK_REASONING_MODELS.has(model)) return true;
  for (const known of GROK_REASONING_MODELS) {
    if (model.startsWith(known)) return true;
  }
  return false;
}

/**
 * Valida y normaliza una tool antes de enviarla a xAI.
 *
 * xAI rechaza (HTTP 400) tools cuyo `parameters` no tiene type:"object"
 * en la raíz. Esta función:
 * 1. Si la tool no tiene parameters, le asigna `{type:"object",properties:{}}`.
 * 2. Si parameters existe pero no tiene type, le añade `type:"object"`.
 * 3. Si parameters tiene type !== "object", lanza un error descriptivo
 *    (mejor fallar acá con mensaje claro que enviar a la API y recibir 400).
 *
 * Referencia: https://docs.x.ai/developers/tools/function-calling
 * "The root of a parameters schema must be an object (type: 'object')"
 */
function normalizeToolForXAI(tool: ToolDefinition): ToolDefinition {
  const params = tool.function.parameters as Record<string, any> | undefined;

  // Si no hay parameters, asignar schema vacío válido
  if (!params) {
    return {
      ...tool,
      function: {
        ...tool.function,
        parameters: { type: 'object', properties: {} },
      },
    };
  }

  // Si no tiene type, añadirlo
  if (!params.type) {
    return {
      ...tool,
      function: {
        ...tool.function,
        parameters: { ...params, type: 'object' },
      },
    };
  }

  // Si tiene type pero no es "object", lanzar error descriptivo
  if (params.type !== 'object') {
    throw new Error(
      `Tool "${tool.function.name}" tiene un schema de parámetros inválido para xAI. ` +
      `La raíz debe ser type:"object" (recibido: type="${params.type}"). ` +
      `Referencia: https://docs.x.ai/developers/tools/function-calling`
    );
  }

  // Si no tiene properties, añadirla vacía
  if (!params.properties) {
    return {
      ...tool,
      function: {
        ...tool.function,
        parameters: { ...params, properties: {} },
      },
    };
  }

  return tool;
}

export class GrokAdapter extends OpenAIAdapter {
  async chat(
    provider: LLMProviderConfig,
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      forceToolChoice?: boolean;
      timeoutMs?: number;
    }
  ): Promise<LLMCallResult> {
    // Resolvemos la URL igual que OpenAIAdapter
    const url = this.resolveChatUrl(provider.apiUrl);
    const startTime = Date.now();

    // ---- Construir el body ----
    const body: Record<string, any> = {
      model: provider.model,
      messages: messages.map((m) => {
        const out: Record<string, any> = { role: m.role, content: m.content };
        if (m.tool_calls) out.tool_calls = m.tool_calls;
        if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
        if (m.name) out.name = m.name;
        return out;
      }),
      max_tokens: provider.maxTokens,
    };

    // ---- Reasoning / Temperature ----
    // Grok soporta system role SIEMPRE, así que NO convertimos system → user
    // (a diferencia de OpenAIAdapter que lo hace para o1/o3).
    const supportsReasoning = modelSupportsReasoning(provider.model);
    if (provider.reasoning && supportsReasoning) {
      // xAI default es 'low'; usamos 'medium' para mayor profundidad en NPCs.
      // Valores posibles: none | low | medium | high
      body.reasoning_effort = 'medium';
      // xAI recomienda NO enviar temperature cuando reasoning_effort != none,
      // porque el modelo ajusta la temperatura internamente según el effort.
      // Si la enviamos, la API la ignora o puede devolver warning.
    } else {
      // Sin reasoning (o modelo que no lo soporta) → temperatura normal
      body.temperature = provider.temperature;
    }

    // ---- Tool calling ----
    // Según https://docs.x.ai/developers/tools/function-calling:
    // - tools[].function.parameters debe ser JSON Schema con type:"object" raíz
    // - tool_choice: "auto" | "required" | "none" | {"type":"function","function":{"name":"..."}}
    // - parallel_tool_calls: true (default). Lo desactivamos si hay 1 sola tool
    //   para evitar comportamiento inesperado (no tiene sentido paralelo con 1 tool).
    // - xAI usa strict mode implícito (siempre true) → los argumentos generados
    //   cumplirán el schema.
    if (provider.toolCalling && options?.tools && options.tools.length > 0) {
      // Validar límite de tools (xAI: máximo 200)
      if (options.tools.length > XAI_MAX_TOOLS) {
        throw new Error(
          `xAI permite máximo ${XAI_MAX_TOOLS} tools por request. ` +
          `Se intentaron enviar ${options.tools.length}.`
        );
      }

      // Normalizar cada tool para que cumpla el schema de xAI.
      // Si una tool tiene schema inválido, lanzamos error descriptivo.
      const normalizedTools = options.tools.map(normalizeToolForXAI);

      body.tools = normalizedTools;

      // tool_choice:
      // - "required" si forceToolChoice=true (el LLM debe llamar al menos una tool)
      // - "auto" en caso contrario (default de xAI: el LLM decide)
      // Lo enviamos explícito para que el comportamiento sea predecible.
      body.tool_choice = options.forceToolChoice ? 'required' : 'auto';

      // parallel_tool_calls: lo dejamos en default (true) si hay múltiples
      // tools, false si solo hay una (no tiene sentido paralelo con 1 tool).
      if (normalizedTools.length === 1) {
        body.parallel_tool_calls = false;
      }
    }

    // ---- Logging para diagnóstico ----
    if (body.tools) {
      console.log(
        `[GrokAdapter] Enviando ${body.tools.length} tool(s) a xAI ` +
        `(model=${provider.model}, tool_choice=${body.tool_choice}, ` +
        `parallel=${body.parallel_tool_calls !== false})`
      );
    }

    // ---- Fetch ----
    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: this.buildHeaders(provider),
        body: JSON.stringify(body),
      },
      options?.timeoutMs ?? 120000
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      // xAI devuelve errores en JSON con { error: { message, code, ... } }
      // Intentamos extraer el mensaje para un diagnóstico claro.
      let errMessage = errText.substring(0, 500);
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          errMessage = errJson.error.message;
        }
      } catch {
        // No es JSON, usar el texto crudo
      }
      throw new Error(
        `xAI Grok API error ${response.status}: ${errMessage}`
      );
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const choice = data.choices?.[0];
    const content: string = choice?.message?.content ?? '';
    const toolCalls: ToolCall[] = Array.isArray(choice?.message?.tool_calls)
      ? choice.message.tool_calls
      : [];

    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    // Logging de tool calls recibidos
    if (toolCalls.length > 0) {
      console.log(
        `[GrokAdapter] Recibidos ${toolCalls.length} tool_call(s): ` +
        toolCalls.map(tc => tc.function.name).join(', ')
      );
    }

    return {
      content,
      toolCalls,
      usage,
      model: data.model ?? provider.model,
      latencyMs,
      finishReason: choice?.finish_reason,
    };
  }

  async testConnection(
    provider: LLMProviderConfig
  ): Promise<{ connected: boolean; message: string; models?: string[] }> {
    // Reusamos el test de OpenAI (GET /models) — la API de xAI es compatible.
    return super.testConnection(provider);
  }
}

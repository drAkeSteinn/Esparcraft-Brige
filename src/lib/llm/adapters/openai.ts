// ============================================
// ADAPTER OPENAI (compatible con OpenAI, Grok xAI, LM Studio, vLLM, etc.)
// Formato: POST {apiUrl}/chat/completions
// ============================================

import { BaseAdapter } from './base';
import {
  LLMProviderConfig, LLMMessage, LLMCallResult,
  ToolDefinition, ToolCall, TokenUsage,
} from '../types';

export class OpenAIAdapter extends BaseAdapter {
  /**
   * En OpenAI-compatible, el endpoint es {apiUrl}/chat/completions.
   * Si apiUrl ya termina en /chat/completions, se respeta.
   */
  private resolveChatUrl(apiUrl: string): string {
    const url = apiUrl.replace(/\/$/, '');
    if (url.endsWith('/chat/completions')) return url;
    if (url.endsWith('/v1')) return `${url}/chat/completions`;
    return `${url}/v1/chat/completions`;
  }

  async chat(
    provider: LLMProviderConfig,
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      forceToolChoice?: boolean;
      timeoutMs?: number;
    }
  ): Promise<LLMCallResult> {
    const url = this.resolveChatUrl(provider.apiUrl);
    const startTime = Date.now();

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

    // Reasoning mode: modelos como o1, o3 no aceptan temperature ni system role
    if (provider.reasoning) {
      // o1/o3 ignoran temperature; en su lugar aceptan reasoning_effort
      body.reasoning_effort = 'medium';
      // OpenAI o1 no soporta role 'system' → convertirlo a 'user' con prefijo
      body.messages = (body.messages as any[]).map((m: any) => {
        if (m.role === 'system') {
          return { ...m, role: 'user', content: `[SYSTEM]\n${m.content}` };
        }
        return m;
      });
    } else {
      body.temperature = provider.temperature;
    }

    // Tool calling
    if (provider.toolCalling && options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      if (options.forceToolChoice) {
        body.tool_choice = 'required';
      }
    }

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
      throw new Error(`OpenAI API error ${response.status}: ${errText.substring(0, 500)}`);
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

    return {
      content,
      toolCalls,
      usage,
      model: data.model ?? provider.model,
      latencyMs,
      finishReason: choice?.finish_reason,
    };
  }

  async listModels(provider: LLMProviderConfig): Promise<string[]> {
    // GET {apiUrl}/models (formato OpenAI)
    const url = provider.apiUrl.replace(/\/$/, '').replace(/\/chat\/completions$/, '');
    const modelsUrl = url.endsWith('/v1')
      ? `${url}/models`
      : `${url}/v1/models`;

    const response = await this.fetchWithTimeout(
      modelsUrl,
      {
        method: 'GET',
        headers: this.buildHeaders(provider),
      },
      15000
    );

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    const models: string[] = (data.data ?? [])
      .map((m: any) => m.id)
      .filter(Boolean);
    return models.sort();
  }

  async testConnection(
    provider: LLMProviderConfig
  ): Promise<{ connected: boolean; message: string; models?: string[] }> {
    try {
      const models = await this.listModels(provider);
      return {
        connected: true,
        message: `Conexión exitosa. ${models.length} modelo(s) disponibles.`,
        models,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'No se pudo conectar',
      };
    }
  }
}

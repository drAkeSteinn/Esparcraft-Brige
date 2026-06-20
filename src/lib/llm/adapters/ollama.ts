// ============================================
// ADAPTER OLLAMA
// - Para chat: usa /v1/chat/completions (OpenAI-compatible)
// - Para listar modelos: usa /api/tags (nativo Ollama)
// - Sin API key necesaria
// ============================================

import { BaseAdapter } from './base';
import {
  LLMProviderConfig, LLMMessage, LLMCallResult,
  ToolDefinition, ToolCall, TokenUsage,
} from '../types';

export class OllamaAdapter extends BaseAdapter {
  /** Endpoint de chat: {apiUrl}/v1/chat/completions */
  private resolveChatUrl(apiUrl: string): string {
    const url = apiUrl.replace(/\/$/, '');
    if (url.endsWith('/chat/completions')) return url;
    if (url.endsWith('/v1')) return `${url}/chat/completions`;
    return `${url}/v1/chat/completions`;
  }

  /** Endpoint de tags: {apiUrl}/api/tags */
  private resolveTagsUrl(apiUrl: string): string {
    const url = apiUrl.replace(/\/$/, '').replace(/\/v1\/?$/, '').replace(/\/api\/tags$/, '');
    return `${url}/api/tags`;
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
      temperature: provider.reasoning ? undefined : provider.temperature,
      max_tokens: provider.maxTokens,
      stream: false,
    };

    // Ollama soporta tool calling nativo vía OpenAI-compatible
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
      throw new Error(`Ollama API error ${response.status}: ${errText.substring(0, 500)}`);
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
    const url = this.resolveTagsUrl(provider.apiUrl);
    const response = await this.fetchWithTimeout(
      url,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      15000
    );
    if (!response.ok) {
      throw new Error(`Failed to list Ollama models: ${response.status}`);
    }
    const data = await response.json();
    const models: string[] = (data.models ?? [])
      .map((m: any) => m.name || m.model)
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
        message: `Ollama conectado. ${models.length} modelo(s) instalados.`,
        models,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error
          ? `No se pudo conectar a Ollama: ${error.message}`
          : 'No se pudo conectar a Ollama. Verifica que el servicio esté activo.',
      };
    }
  }
}

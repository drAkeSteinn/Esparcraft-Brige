// ============================================
// ADAPTER ANTHROPIC CLAUDE
// - Endpoint: POST {apiUrl}/messages
// - Headers: x-api-key + anthropic-version
// - Formato distinto a OpenAI: system va aparte, content puede ser array
// - Tool calling soportado vía "tools" en el body
// ============================================

import { BaseAdapter } from './base';
import {
  LLMProviderConfig, LLMMessage, LLMCallResult,
  ToolDefinition, ToolCall, TokenUsage,
} from '../types';

export class AnthropicAdapter extends BaseAdapter {
  /** Endpoint: {apiUrl}/messages */
  private resolveMessagesUrl(apiUrl: string): string {
    const url = apiUrl.replace(/\/$/, '');
    if (url.endsWith('/messages')) return url;
    if (url.endsWith('/v1')) return `${url}/messages`;
    return `${url}/v1/messages`;
  }

  protected buildHeaders(provider: LLMProviderConfig, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...extra,
    };
    if (provider.apiKey) {
      headers['x-api-key'] = provider.apiKey;
    }
    return headers;
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
    const url = this.resolveMessagesUrl(provider.apiUrl);
    const startTime = Date.now();

    // Anthropic: system va como top-level, no como mensaje
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

    const body: Record<string, any> = {
      model: provider.model,
      max_tokens: provider.maxTokens,
      messages: conversationMessages.map((m) => {
        // Mensajes con tool_calls (assistant)
        if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: 'assistant',
            content: [
              ...(m.content ? [{ type: 'text', text: m.content }] : []),
              ...m.tool_calls.map((tc) => ({
                type: 'tool_use',
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments || '{}'),
              })),
            ],
          };
        }
        // Mensajes de resultado de tool
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content,
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    // Anthropic no usa temperature=0 para reasoning, pero el toggle existe
    body.temperature = provider.temperature;

    // Tool calling
    if (provider.toolCalling && options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
      if (options.forceToolChoice) {
        body.tool_choice = { type: 'any' };
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
      throw new Error(`Anthropic API error ${response.status}: ${errText.substring(0, 500)}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    // Anthropic devuelve content como array de bloques
    const contentBlocks: any[] = Array.isArray(data.content) ? data.content : [];
    const textBlocks = contentBlocks.filter((b) => b.type === 'text');
    const toolUseBlocks = contentBlocks.filter((b) => b.type === 'tool_use');

    const content = textBlocks.map((b) => b.text).join('');

    const toolCalls: ToolCall[] = toolUseBlocks.map((b) => ({
      id: b.id,
      type: 'function' as const,
      function: {
        name: b.name,
        arguments: JSON.stringify(b.input ?? {}),
      },
    }));

    const usage: TokenUsage = {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    };

    return {
      content,
      toolCalls,
      usage,
      model: data.model ?? provider.model,
      latencyMs,
      finishReason: data.stop_reason,
    };
  }

  async testConnection(
    provider: LLMProviderConfig
  ): Promise<{ connected: boolean; message: string; models?: string[] }> {
    try {
      // Anthropic no tiene endpoint público de listado de modelos.
      // Hacemos una llamada mínima para validar API key y modelo.
      const url = this.resolveMessagesUrl(provider.apiUrl);
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: this.buildHeaders(provider),
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        },
        15000
      );
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          connected: false,
          message: `Anthropic API error ${response.status}: ${errText.substring(0, 200)}`,
        };
      }
      return {
        connected: true,
        message: `Conexión exitosa con Claude (${provider.model}).`,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'No se pudo conectar a Anthropic',
      };
    }
  }
}

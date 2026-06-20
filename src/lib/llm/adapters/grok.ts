// ============================================
// ADAPTER GROK (xAI) - Extiende OpenAI (formato compatible)
// - Endpoint: {apiUrl}/chat/completions (igual que OpenAI)
// - Modelos reasoning: grok-3-reasoning, grok-3-mini-reasoning
// - Requiere API key
// ============================================

import { OpenAIAdapter } from './openai';
import { LLMProviderConfig, LLMMessage, LLMCallResult, ToolDefinition } from '../types';

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
    // Grok es OpenAI-compatible; el comportamiento base heredado funciona.
    // Para modelos reasoning, Grok acepta "reasoning_effort" igual que OpenAI.
    return super.chat(provider, messages, options);
  }

  async testConnection(
    provider: LLMProviderConfig
  ): Promise<{ connected: boolean; message: string; models?: string[] }> {
    // Reusamos el test de OpenAI (GET /models)
    return super.testConnection(provider);
  }
}

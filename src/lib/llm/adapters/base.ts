// ============================================
// ADAPTER BASE - Interfaz común para todos los adapters
// ============================================

import { LLMProviderConfig, LLMMessage, LLMCallResult, ToolDefinition } from '../types';

export interface LLMAdapter {
  /** Llama al LLM con los mensajes y tools proporcionados */
  chat(
    provider: LLMProviderConfig,
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      forceToolChoice?: boolean;
      timeoutMs?: number;
    }
  ): Promise<LLMCallResult>;

  /** Lista los modelos disponibles en el proveedor */
  listModels?(provider: LLMProviderConfig): Promise<string[]>;

  /** Verifica la conexión con el proveedor (sin consumir tokens) */
  testConnection(provider: LLMProviderConfig): Promise<{ connected: boolean; message: string; models?: string[] }>;
}

export abstract class BaseAdapter implements LLMAdapter {
  abstract chat(
    provider: LLMProviderConfig,
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      forceToolChoice?: boolean;
      timeoutMs?: number;
    }
  ): Promise<LLMCallResult>;

  abstract testConnection(
    provider: LLMProviderConfig
  ): Promise<{ connected: boolean; message: string; models?: string[] }>;

  listModels?(_provider: LLMProviderConfig): Promise<string[]>;

  /** Helper: construye headers comunes */
  protected buildHeaders(provider: LLMProviderConfig, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }
    return headers;
  }

  /** Helper: ejecuta fetch con timeout */
  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = 120000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

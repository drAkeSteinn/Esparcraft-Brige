// ============================================
// CALL LLM UNIFICADO - Dispatcher de proveedores
// Reemplaza las funciones callLLM duplicadas en triggerHandlers/triggerExecutor
// ============================================

import { providerManager } from './providerManager';
import { OpenAIAdapter } from './adapters/openai';
import { OllamaAdapter } from './adapters/ollama';
import { AnthropicAdapter } from './adapters/anthropic';
import { GrokAdapter } from './adapters/grok';
import { CustomAdapter } from './adapters/custom';
import {
  LLMProviderConfig, LLMProviderType, LLMMessage,
  LLMCallResult, ToolDefinition,
} from './types';
import { ChatMessage } from '../types';

// Singleton adapters
const adapters: Record<LLMProviderType, OpenAIAdapter | OllamaAdapter | AnthropicAdapter | GrokAdapter | CustomAdapter> = {
  openai: new OpenAIAdapter(),
  ollama: new OllamaAdapter(),
  anthropic: new AnthropicAdapter(),
  grok: new GrokAdapter(),
  custom: new CustomAdapter(),
};

function getAdapter(type: LLMProviderType) {
  const adapter = adapters[type];
  if (!adapter) {
    throw new Error(`No adapter registered for provider type: ${type}`);
  }
  return adapter;
}

/**
 * Llama al LLM usando el proveedor activo (marcado como default en la DB).
 *
 * Reemplaza las funciones callLLM duplicadas en triggerHandlers.ts y triggerExecutor.ts.
 *
 * Si no hay proveedor en la DB, intenta crear uno desde .env automáticamente.
 *
 * @param messages - Mensajes en formato ChatMessage (role/content)
 * @param options - Tools opcionales, forceToolChoice, timeout
 * @returns LLMCallResult con content, toolCalls, usage, model, latencyMs
 */
export async function callLLM(
  messages: ChatMessage[],
  options?: {
    tools?: ToolDefinition[];
    forceToolChoice?: boolean;
    timeoutMs?: number;
  }
): Promise<LLMCallResult> {
  // Asegurar que existe al menos un proveedor
  const provider = await providerManager.getActive() ?? await providerManager.ensureDefaultFromEnv();

  if (!provider) {
    throw new Error(
      'No hay ningún proveedor LLM configurado. Ve a Configuración → LLM para crear uno.'
    );
  }

  return callLLMWithProvider(provider, messages, options);
}

/**
 * Llama al LLM usando un proveedor específico (no necesariamente el default).
 * Útil para testing o cuando el usuario quiere probar otro proveedor sin cambiar el default.
 */
export async function callLLMWithProvider(
  provider: LLMProviderConfig,
  messages: ChatMessage[],
  options?: {
    tools?: ToolDefinition[];
    forceToolChoice?: boolean;
    timeoutMs?: number;
  }
): Promise<LLMCallResult> {
  const adapter = getAdapter(provider.type);

  // Convertir ChatMessage → LLMMessage (que incluye tool_calls/tool_call_id opcionales)
  const llmMessages: LLMMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  console.log(
    `[callLLM] provider=${provider.name} (${provider.type}), model=${provider.model}, ` +
    `reasoning=${provider.reasoning}, toolCalling=${provider.toolCalling}, ` +
    `messages=${llmMessages.length}`
  );

  return adapter.chat(provider, llmMessages, {
    tools: options?.tools,
    forceToolChoice: options?.forceToolChoice,
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Lista los modelos disponibles en un proveedor (si el adapter lo soporta).
 */
export async function listModelsForProvider(
  provider: LLMProviderConfig
): Promise<string[]> {
  const adapter = getAdapter(provider.type);
  if (!adapter.listModels) {
    throw new Error(`El proveedor ${provider.type} no soporta listado de modelos`);
  }
  return adapter.listModels(provider);
}

/**
 * Prueba la conexión con un proveedor.
 */
export async function testProviderConnection(
  provider: LLMProviderConfig
): Promise<{ connected: boolean; message: string; models?: string[] }> {
  const adapter = getAdapter(provider.type);
  return adapter.testConnection(provider);
}

export default callLLM;

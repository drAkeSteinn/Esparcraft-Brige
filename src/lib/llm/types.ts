// ============================================
// TIPOS DEL SISTEMA DE PROVEEDORES LLM
// ============================================

import { ChatMessage } from '../types';

/** Tipos de proveedor soportados */
export type LLMProviderType = 'ollama' | 'openai' | 'grok' | 'anthropic' | 'custom';

/** Definición de un proveedor LLM (mapea al modelo Prisma LLMProvider) */
export interface LLMProviderConfig {
  id: string;
  name: string;
  type: LLMProviderType;
  apiUrl: string;
  apiKey?: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  reasoning: boolean;
  toolCalling: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input para crear/actualizar un proveedor */
export interface LLMProviderInput {
  name: string;
  type: LLMProviderType;
  apiUrl: string;
  apiKey?: string | null;
  model: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: boolean;
  toolCalling?: boolean;
  isDefault?: boolean;
}

/** Mensaje en formato unificado para los adapters */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/** Llamada a función/tool */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/** Definición de tool (función disponible para el LLM) */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
  };
}

/** Resultado de ejecutar una tool */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  isError?: boolean;
}

/** Tokens usados en una llamada */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Resultado unificado de una llamada al LLM */
export interface LLMCallResult {
  /** Texto generado por el LLM */
  content: string;
  /** Llamadas a tools solicitadas por el LLM (vacío si no las pidió o si toolCalling=false) */
  toolCalls: ToolCall[];
  /** Tokens usados (0 si el proveedor no los reporta) */
  usage: TokenUsage;
  /** Modelo efectivamente usado (puede diferir del configurado si el proveedor lo ajusta) */
  model: string;
  /** Latencia del fetch en ms */
  latencyMs: number;
  /** Indicador de finished_reason */
  finishReason?: string;
}

/** Opciones para callLLM */
export interface LLMCallOptions {
  /** Tools disponibles para el LLM (solo se envían si provider.toolCalling=true) */
  tools?: ToolDefinition[];
  /** Si true, fuerza al LLM a devolver tool_calls (mode='required' en OpenAI) */
  forceToolChoice?: boolean;
  /** Timeout en ms (default: 120000) */
  timeoutMs?: number;
}

/** Información del proveedor (metadata estática por tipo) */
export interface ProviderInfo {
  type: LLMProviderType;
  label: string;
  description: string;
  defaultApiUrl: string;
  requiresApiKey: boolean;
  supportsReasoning: boolean;
  supportsToolCalling: boolean;
  /** Modelos conocidos sugeridos (el usuario puede escribir uno custom) */
  knownModels: string[];
  /** Modelos que soportan reasoning (para mostrar toggle activo) */
  reasoningModels?: string[];
  /** Color para badges/UI */
  color: string;
  /** Si true, el endpoint de listado de modelos está soportado */
  supportsModelListing: boolean;
}

/** Catálogo de proveedores soportados */
export const PROVIDERS: Record<LLMProviderType, ProviderInfo> = {
  ollama: {
    type: 'ollama',
    label: 'Ollama',
    description: 'Modelos locales en tu máquina. Sin API key necesaria.',
    defaultApiUrl: 'http://localhost:11434',
    requiresApiKey: false,
    supportsReasoning: true,
    supportsToolCalling: true,
    knownModels: [
      'llama3.1', 'llama3.2', 'llama3.3',
      'qwen2.5', 'qwen2.5-coder',
      'deepseek-r1',
      'mistral', 'mistral-nemo',
      'phi3', 'phi4',
      'gemma2', 'gemma3',
    ],
    reasoningModels: ['deepseek-r1', 'qwq', 'marco-o1'],
    color: 'bg-orange-500',
    supportsModelListing: true,
  },
  openai: {
    type: 'openai',
    label: 'OpenAI',
    description: 'GPT-5.5 (frontier), GPT-5.4 mini/nano. Requiere API key.',
    defaultApiUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    supportsReasoning: true,
    supportsToolCalling: true,
    // Modelos actuales al 19/06/2026 (GPT-4o, GPT-4.1, o1, o3, o4-mini deprecados)
    knownModels: [
      'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-instant',
      'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
      'gpt-5-mini', 'gpt-5.1-instant', 'gpt-5.1-thinking',
    ],
    // Todos los GPT-5.x soportan reasoning effort (none/low/medium/high)
    reasoningModels: [
      'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-instant',
      'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
      'gpt-5-mini', 'gpt-5.1-thinking',
    ],
    color: 'bg-emerald-500',
    supportsModelListing: true,
  },
  grok: {
    type: 'grok',
    label: 'Grok (xAI)',
    description: 'Grok 4.3 (frontier), Grok Build 0.1 (coding) y Grok 4.20 (multi-agente). Requiere API key.',
    defaultApiUrl: 'https://api.x.ai/v1',
    requiresApiKey: true,
    supportsReasoning: true,
    supportsToolCalling: true,
    // Modelos actuales al 21/06/2026 (fuente: docs.x.ai + console.x.ai)
    //
    // Modelos de chat (OpenAI-compatible /v1/chat/completions):
    //   - grok-4.3: frontier, 1M context, $1.25/$2.50 per M tokens.
    //     Soporta reasoning_effort: none | low (default) | medium | high.
    //   - grok-build-0.1: modelo de coding rápido, 256K context, $1.00/$2.00.
    //     Pensado para agentes que escriben código.
    //   - grok-4.20-multi-agent-0309: multi-agente, 1M context, $1.25/$2.50.
    //   - grok-4.20-0309-reasoning: variante con reasoning, 1M context.
    //   - grok-4.20-0309-non-reasoning: variante sin reasoning, 1M context.
    //
    // Modelos retirados el 15/05/2026 (redirigen automáticamente a grok-4.3):
    //   grok-3, grok-3-reasoning, grok-4, grok-4-1-fast-*
    //
    // Otros modelos (no de chat, no usar como LLM principal):
    //   grok-imagine-image, grok-imagine-video, Realtime API, TTS, STT.
    knownModels: [
      // Frontier (recomendado para la mayoría de casos)
      'grok-4.3', 'grok-4.3-latest',
      // Multi-agente (marzo 2026)
      'grok-4.20-multi-agent-0309',
      'grok-4.20-0309-reasoning',
      'grok-4.20-0309-non-reasoning',
      // Coding
      'grok-build-0.1',
    ],
    // Modelos que soportan el parámetro reasoning_effort de xAI.
    // grok-4.3 lo soporta con niveles none/low/medium/high.
    // grok-4.20-0309-reasoning también lo soporta.
    // grok-4.20-0309-non-reasoning y grok-4.20-multi-agent-0309 NO lo soportan
    // (ignoran el parámetro o fallan si se envía).
    // grok-build-0.1 no usa reasoning (es de coding rápido).
    reasoningModels: [
      'grok-4.3', 'grok-4.3-latest',
      'grok-4.20-0309-reasoning',
    ],
    color: 'bg-slate-700',
    supportsModelListing: true,
  },
  anthropic: {
    type: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Haiku, Opus. Requiere API key.',
    defaultApiUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    supportsReasoning: false,
    supportsToolCalling: true,
    knownModels: [
      'claude-3-5-sonnet-latest', 'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022',
      'claude-3-opus-latest', 'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    color: 'bg-amber-600',
    supportsModelListing: false,
  },
  custom: {
    type: 'custom',
    label: 'Custom (OpenAI-compatible)',
    description: 'LM Studio, vLLM, Text Gen WebUI, etc. Formato OpenAI.',
    defaultApiUrl: 'http://127.0.0.1:5000/v1',
    requiresApiKey: false,
    supportsReasoning: false,
    supportsToolCalling: true,
    knownModels: ['local-model'],
    color: 'bg-blue-500',
    supportsModelListing: true,
  },
};

/** Lista de tipos de proveedor para UIs (dropdown) */
export const PROVIDER_TYPES = Object.values(PROVIDERS);

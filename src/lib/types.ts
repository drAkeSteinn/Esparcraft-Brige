// Types for Bridge IA - Gestor Narrativo

export interface World {
  id: string;
  name: string;
  lore: {
    estado_mundo: string;
    rumores: string[];
  };
}

export interface Pueblo {
  id: string;
  worldId: string;
  name: string;
  type: 'pueblo' | 'nacion';
  description: string;
  lore: {
    estado_pueblo: string;
    rumores: string[];
  };
}

export interface Coords3D {
  x: number;
  y: number;
  z: number;
}

export interface Area {
  start: Coords3D;
  end: Coords3D;
}

export interface Edificio {
  id: string;
  worldId: string;
  puebloId: string;
  name: string;
  lore: string;
  eventos_recientes: string[];
  area: Area;
}

export interface SillyTavernCard {
  spec?: string;
  spec_version?: string;
  data?: {
    name: string;
    description: string;
    personality: string;
    first_mes: string;
    mes_example: string;
    scenario: string;
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    alternate_greetings?: string[];
    tags?: string[];
    creator?: string;
    character_version?: string;
    extensions?: Record<string, any>;
    avatar?: string;
    group_only_greetings?: string[];
  };
  // Top level fields (for backward compatibility)
  name?: string;
  description?: string;
  personality?: string;
  first_mes?: string;
  mes_example?: string;
  scenario?: string;
  create_date?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, any>;
  avatar?: string;
  group_only_greetings?: string[];
  talkativeness?: string;
  fav?: boolean;
  creatorcomment?: string;
  [key: string]: any;
}

// Helper to get card field (supports both data.* and top-level structure)
export function getCardField<T>(card: SillyTavernCard, field: keyof SillyTavernCard['data'], defaultValue: T): T {
  // Try data.* first (SillyTavern v3 format)
  if (card.data && card.data[field] !== undefined) {
    return card.data[field] as T;
  }
  // Fall back to top-level field
  if (card[field] !== undefined) {
    return card[field] as T;
  }
  return defaultValue;
}

// Helper to set card field (supports both data.* and top-level structure)
export function setCardField(card: SillyTavernCard, field: keyof SillyTavernCard['data'], value: any): void {
  if (!card.data) {
    card.data = {} as any;
  }
  card.data[field] = value;
  // Also set top-level for backward compatibility
  card[field] = value;
}

export interface NPCLocation {
  scope: 'mundo' | 'pueblo' | 'edificio';
  worldId: string;
  puebloId?: string;
  edificioId?: string;
}

export interface NPC {
  id: string;
  location: NPCLocation;
  card: SillyTavernCard;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  npcId: string;
  playerId?: string;
  startTime: string;
  lastActivity: string;
  messages: ChatMessage[];
  summary?: string;
}

export type TriggerMode = 'chat' | 'resumen_sesion' | 'resumen_npc' | 'nuevo_lore';

export interface TriggerPayload {
  mode: TriggerMode;
}

export interface ChatTriggerPayload extends TriggerPayload {
  mode: 'chat';
  message: string;
  npcid: string;
  playersessionid?: string;
  jugador?: {
    nombre?: string;
    raza?: string;
    nivel?: string;
    almakos?: string;
    deuda?: string;
    piedras_del_alma?: string;
    salud_actual?: string;
    reputacion?: string;
    hora?: string;
    clima?: string;
  };
  use_embeddings?: boolean; // NEW: Habilitar/deshabilitar embeddings en el chat
}

export interface ResumenSesionTriggerPayload extends TriggerPayload {
  mode: 'resumen_sesion';
  npcid: string;
  playersessionid: string;
}

export interface ResumenNPCTriggerPayload extends TriggerPayload {
  mode: 'resumen_npc';
  npcid: string;
}

export interface NuevoLoreTriggerPayload extends TriggerPayload {
  mode: 'nuevo_lore';
  scope: 'mundo' | 'pueblo';
  targetId: string;
  loreType: string;
  context: string;
}

export type AnyTriggerPayload =
  | ChatTriggerPayload
  | ResumenSesionTriggerPayload
  | ResumenNPCTriggerPayload
  | NuevoLoreTriggerPayload;

export interface PromptBuildContext {
  world?: World;
  pueblo?: Pueblo;
  edificio?: Edificio;
  npc?: NPC;
  session?: Session;
  loreType?: string;
  context?: string;
  jugador?: {
    nombre?: string;
    raza?: string;
    nivel?: string;
    almakos?: string;
    deuda?: string;
    piedras_del_alma?: string;
    salud_actual?: string;
    reputacion?: string;
    hora?: string;
    clima?: string;
  };
}

export interface LLMRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PromptDebugInfo {
  systemPrompt: string;
  messages: ChatMessage[];
  context: PromptBuildContext;
  estimatedTokens: number;
  finalRequest: LLMRequest;
}

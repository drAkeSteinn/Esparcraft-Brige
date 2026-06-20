// Types for the Bridge IA - Gestor Narrativo

export interface World {
  id: string;
  name: string;
  lore: string; // Estado del mundo (string directo)
  area?: Area; // Área calculada a partir de las regiones (pueblos) que contiene
}

export interface Pueblo {
  id: string;
  worldId: string;
  name: string;
  type: 'pueblo' | 'nacion';
  description: string;
  area?: Area; // Área calculada a partir de las edificaciones que contiene
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

// PlaceType: Tipo de lugar compartido globalmente
export interface PlaceType {
  id: string;
  name: string;
  icon: string; // Icono de Lucide (ej: 'Door', 'Table', 'Monitor')
  color?: string; // Color personalizado opcional (ej: '#FF5733', '#3498DB')
}

// PointOfInterest: Punto de interés dentro de un edificio
export interface PointOfInterest {
  id: string;
  name: string; // Nombre específico del POI
  coordenadas: Coords3D; // Posición X, Y, Z
  descripcion: string; // Qué se hace en este punto
  tipo: string; // Referencia al PlaceType (ID del tipo)
  imagen?: string; // Ruta de la imagen (opcional)
  tags?: string[]; // Tags adicionales personalizables (opcional)
}

export interface Edificio {
  id: string;
  worldId: string;
  puebloId: string;
  name: string;
  lore: string; // Estado del edificio (string directo)
  area: Area;
  puntosDeInteres?: PointOfInterest[]; // Puntos de interés dentro del edificio
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
    extensions?: SillyTavernExtensions;
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
  extensions?: SillyTavernExtensions;
  avatar?: string;
  group_only_greetings?: string[];
  talkativeness?: string;
  fav?: boolean;
  creatorcomment?: string;
  [key: string]: any;
}

// Extensions para SillyTavernCard
export interface SillyTavernExtensions {
  jsonResponse?: JsonResponseConfig;
  [key: string]: any;
}

// Configuración de respuesta JSON para NPCs
export interface JsonResponseConfig {
  enabled: boolean;
  schema: Record<string, any> | null;           // Esquema JSON esperado
  exampleResponse: Record<string, any> | null;  // Ejemplo de respuesta válida
  fallbackResponse: Record<string, any> | null; // Respuesta de seguridad
  correctionPrompt: string | null;              // Prompt para corregir respuesta errónea
  maxRetries: number;                           // Máximo de reintentos (default: 2)
}

// Resultado del procesamiento JSON
export interface JsonProcessResult {
  success: boolean;
  data: Record<string, any> | string;  // JSON parseado o string original
  rawResponse: string;                  // Respuesta original del LLM
  metadata: {
    jsonMode: boolean;
    attempts: number;
    corrected: boolean;
    usedFallback: boolean;
    error?: string;
  };
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

// Interfaz reutilizable para datos del jugador
export interface Jugador {
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
  humor_delta?: string; // Delta de humor del NPC para esta interacción
}

// Session Summary: Resumen de sesión con metadata completa
export interface SessionSummary {
  sessionId: string;
  npcId: string;
  playerId?: string;
  playerName?: string;
  npcName?: string;
  summary: string;
  timestamp: string;
  version: number;
}

// Session Summary Entry: Entrada en el historial de resúmenes de una sesión
export interface SessionSummaryEntry {
  summary: string;
  timestamp: string;
  version: number;
}

export interface Session {
  id: string;
  npcId: string;
  playerId?: string;
  jugador?: Jugador;  // ← Snapshot del jugador en esta sesión
  startTime: string;
  lastActivity: string;
  messages: ChatMessage[];
  summary?: string;
  lastPrompt?: string;
  summaryHistory?: SessionSummaryEntry[];  // ← Historial de resúmenes de esta sesión
}

export type TriggerMode = 'chat' | 'resumen_sesion' | 'resumen_npc' | 'resumen_edificio' | 'resumen_pueblo' | 'resumen_mundo' | 'nuevo_lore' | 'nuevo_contexto';

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
    humor_delta?: string; // Delta de humor del NPC para esta interacción
  };
  templateUser?: string; // Plantilla del usuario opcional
  lastSummary?: string; // Último resumen de la sesión (opcional)
}

export interface ResumenSesionTriggerPayload extends TriggerPayload {
  mode: 'resumen_sesion';
  npcid: string;
  playersessionid: string;
  systemPrompt?: string; // System prompt personalizado (opcional, se carga del archivo si no se proporciona)
  lastSummary?: string; // Último resumen de la sesión (opcional)
  chatHistory?: string; // Historial de chat (opcional, se obtiene de la sesión si no se proporciona)
  // ✅ EL MODO RESUMEN SESIÓN NO USA GRIMORIO TEMPLATES
}

export interface ResumenNPCTriggerPayload extends TriggerPayload {
  mode: 'resumen_npc';
  npcid: string;
  systemPrompt?: string; // System prompt personalizado (opcional, se carga del archivo si no se proporciona)
  allSummaries?: string; // Lista formateada de resúmenes de sesiones del NPC (opcional, se obtiene automáticamente si no se proporciona)
}

export interface ResumenEdificioTriggerPayload extends TriggerPayload {
  mode: 'resumen_edificio';
  edificioid: string;
  systemPrompt?: string; // System prompt personalizado (opcional, se carga del archivo si no se proporciona)
  allSummaries?: string; // Lista formateada de resúmenes de NPCs del edificio (opcional, se obtiene automáticamente si no se proporciona)
}

export interface ResumenPuebloTriggerPayload extends TriggerPayload {
  mode: 'resumen_pueblo';
  pueblid: string;
  systemPrompt?: string; // ✅ NUEVO: System prompt personalizado (opcional, se carga del archivo si no se proporciona)
  allSummaries?: string; // ✅ NUEVO: Lista formateada de resúmenes de edificios del pueblo (opcional, se obtiene automáticamente si no se proporciona)
}

export interface ResumenMundoTriggerPayload extends TriggerPayload {
  mode: 'resumen_mundo';
  mundoid: string;
  systemPrompt?: string; // ✅ NUEVO: System prompt personalizado (opcional, se carga del archivo si no se proporciona)
  allSummaries?: string; // ✅ NUEVO: Lista formateada de resúmenes de pueblos/naciones del mundo (opcional, se obtiene automáticamente si no se proporciona)
}

export interface NuevoLoreTriggerPayload extends TriggerPayload {
  mode: 'nuevo_lore';
  scope: 'mundo' | 'pueblo';
  targetId: string;
  loreType: string;
  context: string;
}

// Nuevo Contexto Trigger: da acceso temporal a los namespaces de otra entidad
export interface NuevoContextoTriggerPayload extends TriggerPayload {
  mode: 'nuevo_contexto';
  type: 'npc' | 'edificio' | 'pueblo' | 'nacion' | 'mundo';
  typeid: string;        // ID de la entidad que recibe el contexto
  targetid: string;      // ID de la entidad cuyo namespace se comparte
  duration: string;      // Duración en días (string para compatibilidad con HTTP)
}

export type AnyTriggerPayload =
  | ChatTriggerPayload
  | ResumenSesionTriggerPayload
  | ResumenNPCTriggerPayload
  | ResumenEdificioTriggerPayload
  | ResumenPuebloTriggerPayload
  | ResumenMundoTriggerPayload
  | NuevoLoreTriggerPayload
  | NuevoContextoTriggerPayload;

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
    humor_delta?: string; // Delta de humor del NPC para esta interacción
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

// Tipos de cards del Grimorio
export type GrimorioCardType = 'variable' | 'plantilla';

// Sub-tipo de plantilla: normal (texto fijo con variables) o condicional (branches por atributos de NPC)
export type GrimorioTemplateSubtype = 'normal' | 'condicional';

// Categorías de cards del Grimorio
export type GrimorioCardCategory = 
  | 'general'          // Plantillas genéricas
  | 'variables'        // Variables primarias (solo informativas)
  | 'jugador'          // Plantillas de jugador
  | 'npc'              // Plantillas de NPC
  | 'ubicacion'        // Plantillas de ubicación
  | 'mundo';           // Plantillas de mundo

// ============================================
// PLANTILLAS CONDICIONALES DEL GRIMORIO
// ============================================

// Operadores soportados para condiciones sobre atributos de NPC
export type ConditionOperator =
  | 'eq'           // igual (numérico o texto)
  | 'neq'          // distinto (numérico o texto)
  | 'gt'           // mayor que (numérico)
  | 'lt'           // menor que (numérico)
  | 'gte'          // mayor o igual (numérico)
  | 'lte'          // menor o igual (numérico)
  | 'contains'     // contiene (texto)
  | 'not_contains' // no contiene (texto)
  | 'starts_with'  // empieza con (texto)
  | 'ends_with'    // termina con (texto)
  | 'in_list'      // es uno de (lista) — el valor seleccionado está en la lista
  | 'not_in_list'; // no es uno de (lista) — el valor seleccionado NO está en la lista

// Una condición individual sobre un atributo del NPC
export interface Condition {
  id: string;            // ID único de la condición dentro del branch
  attributeKey: string;  // Key del atributo del NPC (ej: "vida", "resistencia", "raza")
  operator: ConditionOperator;
  value: string;         // Valor a comparar (string; se parsea a número si el atributo es numérico)
}

// Combinador lógico entre condiciones dentro de un branch
export type ConditionCombinator = 'AND' | 'OR';

// Un branch condicional: conjunto de condiciones combinadas con AND/OR
// Si todas (AND) o alguna (OR) se cumplen → se usa el `template` de este branch
export interface ConditionalBranch {
  id: string;            // ID único del branch
  name: string;          // Nombre descriptivo (ej: "Vida media", "Aliado herido")
  combinator: ConditionCombinator;
  conditions: Condition[];
  template: string;      // Plantilla a inyectar si este branch se cumple
}

// Configuración completa de una plantilla condicional
export interface ConditionalConfig {
  npcId: string;          // NPC de referencia (para validar atributos en la UI)
  branches: ConditionalBranch[];  // Branches en orden de evaluación
  defaultTemplate: string;        // Fallback si ningún branch aplica
}

// GrimorioCard: Plantilla reutilizable con variables
export interface GrimorioCard {
  id: string;                          // ID único de la card
  key: string;                        // Key para la variable (ej: "datos_jugador", "estado_jugador")
  nombre: string;                     // Nombre descriptivo de la plantilla
  plantilla: string;                  // Texto con variables (ej: "DATOS DEL AVENTURERO\nNombre: {{jugador.nombre}}...")
                                      // Para tipo 'variable': puede estar vacío o con documentación
                                      // Para plantilla condicional: contiene el JSON de ConditionalConfig
  categoria: GrimorioCardCategory;    // Categoría de la card
  tipo: GrimorioCardType;            // Tipo: 'variable' (solo informativa) o 'plantilla' (reutilizable)
  templateType?: GrimorioTemplateSubtype; // Sub-tipo: 'normal' (default) o 'condicional'
  conditionalConfig?: ConditionalConfig | null;  // Config de branches (solo si templateType='condicional')
  timestamp: string;                  // Timestamp de creación/modificación
  descripcion?: string;                 // Descripción opcional de la plantilla
}

// Tipos para requests de API de Grimorio
export interface CreateGrimorioCardRequest {
  key: string;
  nombre: string;
  plantilla: string;
  categoria: GrimorioCardCategory;
  tipo: GrimorioCardType;      // Nuevo campo requerido
  templateType?: GrimorioTemplateSubtype;  // Sub-tipo (default: 'normal')
  conditionalConfig?: ConditionalConfig | null;
  descripcion?: string;
}

export interface UpdateGrimorioCardRequest {
  nombre: string;
  plantilla: string;
  categoria: GrimorioCardCategory;
  tipo?: GrimorioCardType;   // Campo opcional en actualización
  templateType?: GrimorioTemplateSubtype;
  conditionalConfig?: ConditionalConfig | null;
  descripcion?: string;
}

// Resultado de validación de una plantilla del Grimorio
export interface ValidateGrimorioCardResult {
  valid: boolean;
  tipo: GrimorioCardType;
  variablesUsed: string[];          // Variables primarias usadas
  nestedTemplates: string[];         // Plantillas anidadas detectadas
  missingVariables: string[];         // Variables no existen en el glosario
  warnings: string[];
  preview?: string;                   // Preview con contexto de prueba
}

export interface ApplyGrimorioCardRequest {
  context: {
    world?: World;
    pueblo?: Pueblo;
    edificio?: Edificio;
    npc?: NPC;
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
      humor_delta?: string; // Delta de humor del NPC para esta interacción
    };
    session?: Session;
    mensaje?: string;
  };
}

// ============================================
// SISTEMA DE ATRIBUTOS DE NPC
// ============================================

/** Tipo de atributo: numérico (con min/max/valor) o texto libre */
export type AttributeType = 'numeric' | 'text' | 'list';

/** Plantilla global de atributo reutilizable entre NPCs */
export interface AttributeTemplate {
  id: string;
  name: string;             // Nombre descriptivo (ej: "Fuerza")
  key: string;              // Key para usar como {{key}} (única global)
  type: AttributeType;
  minValue?: number | null; // Solo numeric
  maxValue?: number | null; // Solo numeric
  defaultValue?: string | null; // Valor por defecto al instanciar
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Instancia de un atributo en un NPC específico */
export interface NPCAttribute {
  id: string;
  npcId: string;
  name: string;
  key: string;              // Única por NPC
  type: AttributeType;
  valueText?: string | null;   // Para type='text'
  valueNumber?: number | null; // Para type='numeric' (valor actual)
  minValue?: number | null;    // Para type='numeric'
  maxValue?: number | null;    // Para type='numeric'
  createdAt: string;
  updatedAt: string;
}

/** Payload para crear/actualizar una plantilla de atributo */
export interface AttributeTemplateInput {
  name: string;
  key: string;
  type: AttributeType;
  minValue?: number | null;
  maxValue?: number | null;
  defaultValue?: string | null;
  description?: string | null;
}

/** Payload para crear/actualizar un atributo de NPC */
export interface NPCAttributeInput {
  name: string;
  key: string;
  type: AttributeType;
  valueText?: string | null;
  valueNumber?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
}

// ============================================
// SISTEMA DE ACCIONES DE NPC
// ============================================

/** Acción que un NPC puede ejecutar durante el chat */
export interface NPCAction {
  id: string;
  npcId: string;
  name: string;             // Nombre descriptivo (ej: "Vender")
  key: string;              // Key única por NPC (ej: "vender")
  description: string;      // Cuándo usarla (ej: "Vender un item al jugador")
  parameters?: Record<string, any> | null; // JSON schema de parámetros
  createdAt: string;
  updatedAt: string;
}

/** Payload para crear/actualizar una acción */
export interface NPCActionInput {
  name: string;
  key: string;
  description: string;
  parameters?: Record<string, any> | null;
}

/**
 * Formatea las acciones de un NPC como una lista de texto para incluir
 * en el system_prompt (para modelos sin tool calling).
 *
 * Ejemplo:
 *   Acciones disponibles:
 *   - vender: Vender un item. Parámetros: item, precio
 *   - saludar: Saludar al jugador.
 *
 * Si ejecutas una acción, inclúyela al FINAL de tu respuesta:
 * [ACCION: nombre|parametro=valor, parametro=valor]
 */
export function formatActionsForPrompt(actions: NPCAction[]): string {
  if (!actions || actions.length === 0) return '';

  const lines = actions.map(a => {
    const params = a.parameters
      ? Object.entries(a.parameters).map(([k, v]) => k).join(', ')
      : '';
    return `- ${a.key}: ${a.description}${params ? `. Parámetros: ${params}` : ''}`;
  });

  return `Acciones disponibles:\n${lines.join('\n')}\n\nSi ejecutas una acción, inclúyela al FINAL de tu respuesta en esta línea:\n[ACCION: nombre|parametro=valor, parametro=valor]`;
}

/**
 * Parsea una línea [ACCION: nombre|parametro=valor, parametro=valor]
 * del final de la respuesta del LLM.
 *
 * Retorna las acciones parseadas y el texto del diálogo sin la línea.
 */
export function parseActionFromResponse(text: string): {
  dialogText: string;
  actions: Array<{ name: string; arguments: Record<string, any> }>;
} {
  const actions: Array<{ name: string; arguments: Record<string, any> }> = [];
  let dialogText = text;

  // Buscar todas las líneas [ACCION: ...]
  const actionRegex = /\[ACCION:\s*([^\]|]+)(?:\|([^\]]+))?\]/gi;
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const actionName = match[1].trim();
    const paramsStr = match[2] || '';

    const args: Record<string, any> = {};
    if (paramsStr.trim()) {
      paramsStr.split(',').forEach(param => {
        const [key, ...valueParts] = param.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Intentar parsear como número
          const num = parseFloat(value);
          args[key.trim()] = isNaN(num) ? value : num;
        }
      });
    }

    actions.push({ name: actionName, arguments: args });
  }

  // Si se encontraron acciones, eliminar las líneas [ACCION:] del texto
  if (actions.length > 0) {
    dialogText = text.replace(actionRegex, '').trim();
  }

  return { dialogText, actions };
}

// ============================================
// FORMATO DE RESPUESTA ESTRUCTURADA POR LA APP
// ============================================

/**
 * Estructura de la respuesta HTTP que la app construye SIEMPRE.
 * El LLM ya no necesita generar JSON — la app estructura todo.
 */
export interface StructuredChatResponse {
  /** Texto del diálogo del NPC (texto natural del LLM) */
  response: string;
  /** Sesión asociada */
  sessionId: string;
  /** Acciones ejecutadas por el NPC (via tool calling o [ACCION:]) */
  actions?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  /** Metadata del procesamiento */
  metadata: {
    model: string;
    latencyMs: number;
    tokensUsed?: { prompt: number; completion: number; total: number };
    toolCallingUsed: boolean; // true si se usó tool calling nativo
  };
}

/**
 * Formatea un atributo para su inserción como {{key}} en una card.
 *
 * - Numérico: "Nombre: actual/max" (o "Nombre: actual" si no hay max,
 *   o "Nombre: min/actual/max" si hay min y max y el usuario quiere ver rango completo).
 *   Por defecto mostramos "actual/max" cuando hay max, o solo "actual".
 * - Texto: el valor tal cual.
 */
export function formatAttributeValue(attr: NPCAttribute): string {
  if (attr.type === 'numeric') {
    const current = attr.valueNumber ?? 0;
    const max = attr.maxValue;
    if (max !== null && max !== undefined) {
      return `${current}/${max}`;
    }
    return `${current}`;
  }
  if (attr.type === 'list') {
    // El valor se guarda como string separado por comas en valueText
    // Se formatea como lista con guiones para inyectar en el prompt
    const raw = attr.valueText ?? '';
    const items = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (items.length === 0) return '';
    return items.map(i => `- ${i}`).join('\n');
  }
  // text
  return attr.valueText ?? '';
}

/**
 * Parsea el valor de un atributo tipo 'list' a un array de strings.
 * Ej: "casa, edificio, farmacia" → ["casa", "edificio", "farmacia"]
 */
export function parseListAttributeValue(valueText: string | null | undefined): string[] {
  if (!valueText) return [];
  return valueText.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// ============================================
// EMBEDDINGS TYPES
// ============================================
//
// NOTA: Los tipos y constantes obsoletos relacionados con el antiguo sistema
// de namespaces por trigger (EmbeddingTriggerConfig, EmbeddingContext,
// *WithEmbeddings, EMBEDDING_NAMESPACES) fueron eliminados en favor del
// nuevo sistema de namespaces por entidad gestionado por `namespaceManager.ts`.
//
// El sistema actual usa la convención {tipo}:{id}:
//   - mundo:{worldId}
//   - pueblo:{puebloId}
//   - edificio:{edificioId}
//   - npc:{npcId}
//   - sesion:{sessionId}
//
// Ver: src/lib/namespaceManager.ts y src/lib/embedding-triggers.ts


/**
 * Tipos TypeScript para el Mapa 2D Interactivo
 * Sistema basado en Konva Canvas 2D
 */

// ============================================================================
// Tipos de Coordenadas
// ============================================================================

/**
 * Coordenadas en el sistema de Minecraft
 * worldX, worldZ = coordenadas del mundo de Minecraft
 * worldY = altura (opcional para edificios con múltiples pisos)
 */
export interface MinecraftCoords {
  worldX: number;
  worldY?: number; // Altura (opcional)
  worldZ: number;
}

/**
 * Coordenadas en píxeles del Canvas (aplicando escala)
 * x, y = coordenadas renderizadas en el mapa 2D
 */
export interface PixelCoords {
  x: number;
  y: number;
}

/**
 * Rango de coordenadas (para áreas)
 */
export interface CoordBounds {
  start: MinecraftCoords;
  end: MinecraftCoords;
}

// ============================================================================
// Tipos de Viewport
// ============================================================================

/**
 * Estado del viewport (vista visible del mapa)
 */
export interface ViewportState {
  scale: number;           // Zoom actual (1.0 = 100%)
  offsetX: number;         // Desplazamiento X en píxeles
  offsetY: number;         // Desplazamiento Y en píxeles
  width: number;          // Ancho del viewport
  height: number;         // Alto del viewport
  centerX: number;        // Centro X en píxeles
  centerY: number;        // Centro Y en píxeles
}

/**
 * Configuración de límites del viewport
 */
export interface ViewportLimits {
  minScale: number;       // Zoom mínimo (ej. 0.1 = 10%)
  maxScale: number;       // Zoom máximo (ej. 5.0 = 500%)
  defaultScale: number;   // Zoom por defecto (1.0 = 100%)
}

// ============================================================================
// Tipos de Capas (Layers)
// ============================================================================

/**
 * Tipos de capas disponibles en el mapa
 */
export type MapLayerType =
  | 'background'   // Imagen de fondo / tiles
  | 'zones'       // Zonas y pueblos (polígonos)
  | 'buildings'   // Edificios (rectángulos)
  | 'npcs'        // NPCs y players (íconos)
  | 'routes'       // Rutas y caminos
  | 'activity'     // Heatmap de actividad
  | 'ui';         // UI: tooltips, selección, bounding boxes

/**
 * Configuración de una capa
 */
export interface LayerConfig {
  id: MapLayerType;
  name: string;           // Nombre visible para usuario
  visible: boolean;        // Si la capa está visible
  locked: boolean;         // Si la capa está bloqueada (no editable)
  opacity: number;         // Opacidad (0-1)
  zIndex: number;          // Orden de renderizado
  color?: string;          // Color de referencia para la capa
}

/**
 * Estado de todas las capas
 */
export interface LayersState {
  layers: Record<MapLayerType, LayerConfig>;
  activeLayer: MapLayerType;  // Capa actualmente activa (para edición)
}

/**
 * Configuración por defecto de las capas
 */
export const DEFAULT_LAYERS: Record<MapLayerType, LayerConfig> = {
  background: {
    id: 'background',
    name: 'Fondo',
    visible: true,
    locked: true,
    opacity: 1,
    zIndex: 0,
    color: '#e2e8f0'
  },
  zones: {
    id: 'zones',
    name: 'Zonas',
    visible: true,
    locked: false,
    opacity: 0.7,
    zIndex: 10,
    color: '#8b5cf6'
  },
  buildings: {
    id: 'buildings',
    name: 'Edificios',
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 20,
    color: '#3b82f6'
  },
  npcs: {
    id: 'npcs',
    name: 'NPCs',
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 30,
    color: '#22c55e'
  },
  routes: {
    id: 'routes',
    name: 'Rutas',
    visible: true,
    locked: false,
    opacity: 0.6,
    zIndex: 15,
    color: '#f59e0b'
  },
  activity: {
    id: 'activity',
    name: 'Actividad',
    visible: false,  // Oculto por defecto (feature premium)
    locked: true,
    opacity: 0.5,
    zIndex: 5,
    color: '#ef4444'
  },
  ui: {
    id: 'ui',
    name: 'Interfaz',
    visible: true,
    locked: true,
    opacity: 1,
    zIndex: 1000,
    color: '#64748b'
  }
};

// ============================================================================
// Tipos de Selección
// ============================================================================

/**
 * Tipos de elementos seleccionables en el mapa
 */
export type SelectableType = 'building' | 'pueblo' | 'npc' | 'zone' | 'route';

/**
 * Elemento seleccionable con sus datos
 */
export interface SelectableElement {
  id: string;
  type: SelectableType;
  name: string;
  coords: MinecraftCoords;
  data?: any;  // Datos adicionales según el tipo
}

/**
 * Estado de selección actual
 */
export interface SelectionState {
  selectedIds: Set<string>;  // IDs de elementos seleccionados
  hoveredId: string | null;   // ID del elemento bajo el mouse
  selectionType: 'single' | 'multiple';  // Tipo de selección
  selectionBox: SelectionBox | null;  // Caja de selección (para selección múltiple)
}

/**
 * Caja de selección para drag-box selection
 */
export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}

// ============================================================================
// Tipos de Edición
// ============================================================================

/**
 * Modos de edición disponibles
 */
export type EditMode = 'view' | 'select' | 'create' | 'edit' | 'delete';

/**
 * Tipo de elemento a crear en modo edición
 */
export type CreateType = 'building' | 'zone' | 'route' | 'npc';

/**
 * Estado del modo de edición
 */
export interface EditState {
  mode: EditMode;
  createType?: CreateType;
  snapToGrid: boolean;
  gridSize: number;           // Tamaño de grilla en bloques de Minecraft
  isCreating: boolean;
  tempElement?: TemporaryElement;
}

/**
 * Elemento temporal mientras se crea
 */
export interface TemporaryElement {
  type: CreateType;
  coords: MinecraftCoords;
  complete: boolean;
}

/**
 * Snap a grilla
 */
export interface GridSnapResult {
  snappedX: number;
  snappedZ: number;
  snapped: boolean;
}

// ============================================================================
// Tipos de Tooltip
// ============================================================================

/**
 * Estado del tooltip
 */
export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  element: SelectableElement | null;
}

/**
 * Contenido del tooltip
 */
export interface TooltipContent {
  id: string;
  name: string;
  type: SelectableType;
  description?: string;
  extraInfo?: Record<string, any>;
}

// ============================================================================
// Mapa 2D - Estado Principal
// ============================================================================

/**
 * Estado completo del mapa 2D interactivo
 */
export interface Map2DState {
  // Viewport
  viewport: ViewportState;

  // Capas
  layers: LayersState;

  // Selección
  selection: SelectionState;

  // Edición
  edit: EditState;

  // Tooltip
  tooltip: TooltipState;

  // Busqueda
  search: MapSearchState;

  // Cargando
  loading: boolean;
}

/**
 * Estado de búsqueda en el mapa
 */
export interface MapSearchState {
  query: string;
  results: SelectableElement[];
  visible: boolean;
  selectedIndex: number;
}

// ============================================================================
// Utilidades de Coordenadas
// ============================================================================

/**
 * Opciones para transformación de coordenadas
 */
export interface CoordTransformOptions {
  scale: number;
  offsetX?: number;
  offsetY?: number;
  origin?: 'center' | 'top-left';
}

/**
 * Resultado de transformación de coordenadas
 */
export interface CoordTransformResult {
  pixelCoords: PixelCoords;
  minecraftCoords: MinecraftCoords;
}

/**
 * Conversor de coordenadas (Minecraft ↔ Pixels)
 */
export interface CoordConverter {
  minecraftToPixel(mc: MinecraftCoords, options: CoordTransformOptions): PixelCoords;
  pixelToMinecraft(px: PixelCoords, options: CoordTransformOptions): MinecraftCoords;
  snapToGrid(mc: MinecraftCoords, gridSize: number): GridSnapResult;
  distance(a: MinecraftCoords, b: MinecraftCoords): number;
  normalizeRect(bounds: CoordBounds): CoordBounds;
}

// ============================================================================
// Tipos de Elementos Renderizados
// ============================================================================

/**
 * Edificio renderizado en el mapa
 */
export interface MapBuilding {
  id: string;
  name: string;
  coords: MinecraftCoords;
  size: {
    width: number;   // En bloques de Minecraft
    length: number;  // En bloques de Minecraft
    height?: number;  // Altura en bloques (opcional)
  };
  color: string;
  borderColor?: string;
  selected: boolean;
  hovered: boolean;
  data: any;  // Datos del edificio original
}

/**
 * NPC renderizado en el mapa
 */
export interface MapNPC {
  id: string;
  name: string;
  coords: MinecraftCoords;
  icon?: string;  // Icono del NPC
  color?: string;
  selected: boolean;
  hovered: boolean;
  data: any;  // Datos del NPC original
}

/**
 * Zona/Pueblo renderizado en el mapa
 */
export interface MapZone {
  id: string;
  name: string;
  type: 'pueblo' | 'nacion' | 'custom';
  polygon: Array<{ x: number; y: number; z: number }>;
  color: string;
  selected: boolean;
  hovered: boolean;
  data: any;
}

/**
 * Ruta renderizada en el mapa
 */
export interface MapRoute {
  id: string;
  name: string;
  points: Array<{ x: number; z: number }>;
  color: string;
  width: number;
  selected: boolean;
  hovered: boolean;
  data: any;
}

// ============================================================================
// Eventos del Mapa
// ============================================================================

/**
 * Evento de zoom del mapa
 */
export interface MapZoomEvent {
  scale: number;
  centerX: number;
  centerY: number;
  delta: number;
}

/**
 * Evento de pan del mapa
 */
export interface MapPanEvent {
  deltaX: number;
  deltaY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Evento de click en el mapa
 */
export interface MapClickEvent {
  x: number;
  y: number;
  minecraftCoords: MinecraftCoords;
  element?: SelectableElement;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

/**
 * Evento de hover en el mapa
 */
export interface MapHoverEvent {
  x: number;
  y: number;
  minecraftCoords: MinecraftCoords;
  element?: SelectableElement;
}

/**
 * Evento de selección
 */
export interface MapSelectionEvent {
  selected: SelectableElement[];
  deselected: SelectableElement[];
  selectionType: 'single' | 'add' | 'remove' | 'clear' | 'box';
}

// ============================================================================
// Constantes
// ============================================================================

/**
 * Constantes del mapa 2D
 */
export const MAP_CONSTANTS = {
  DEFAULT_BLOCK_SIZE: 10,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 5.0,
  ZOOM_STEP: 0.1,
  DEFAULT_GRID_SIZE: 1,
  SELECTION_COLOR: '#3b82f6',
  SELECTION_BORDER_COLOR: '#2563eb',
  SELECTION_BORDER_WIDTH: 2,
  HOVER_COLOR: 'rgba(59, 130, 246, 0.2)',
  HOVER_BORDER_COLOR: 'rgba(59, 130, 246, 0.5)',
  ANIMATION_DURATION: 150,
  DEBOUNCE_DELAY: 100,
} as const;

/**
 * Colores por tipo de elemento
 */
export const ELEMENT_COLORS = {
  building: {
    default: '#3b82f6',
    selected: '#2563eb',
    hovered: '#60a5fa'
  },
  pueblo: {
    default: '#22c55e',
    selected: '#16a34a',
    hovered: '#4ade80'
  },
  nacion: {
    default: '#8b5cf6',
    selected: '#7c3aed',
    hovered: '#a78bfa'
  },
  npc: {
    default: '#f59e0b',
    selected: '#d97706',
    hovered: '#fbbf24'
  },
  zone: {
    default: '#64748b',
    selected: '#475569',
    hovered: '#94a3b8'
  },
  route: {
    default: '#ec4899',
    selected: '#db2777',
    hovered: '#f472b6'
  }
} as const;

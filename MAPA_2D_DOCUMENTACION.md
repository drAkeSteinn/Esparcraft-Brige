# 🗺️ Mapa 2D Interactivo — Documentación Completa

---

## 📋 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual del Proyecto](#2-estado-actual-del-proyecto)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Librería del Mapa](#4-biblioteca-del-mapa)
5. [Componentes del Mapa](#5-componentes-del-mapa)
6. [Sistema de Coordenadas](#6-sistema-de-coordenadas)
7. [Funcionalidades Implementadas](#7-funcionalidades-implementadas)
8. [Funcionalidades Pendientes](#8-funcionalidades-pendientes)
9. [Integración con APIs](#9-integración-con-apis)
10. [Guía de Desarrollo](#10-guia-de-desarrollo)

---

## 1. Resumen Ejecutivo

### 1.1 Objetivo del Mapa 2D

Crear un **mapa interactivo 2D** para visualizar el mundo narrativo de Esparcraft con capacidades de:
- ✅ **Navegación fluida**: Pan con arrastre del mouse, zoom con rueda centrado
- ✅ **Selección de elementos**: Click simple y selección múltiple (Shift+click)
- ✅ **Sistema de capas**: 7 capas independientes (fondo, zonas, edificios, NPCs, rutas, actividad, UI)
- ✅ **Edición básica**: Crear, editar, eliminar elementos
- ✅ **Tooltips informativos**: Información detallada al hacer hover
- ✅ **Highlight visual**: Indicación clara de elementos seleccionados

### 1.2 Tecnologías Utilizadas

| Tecnología | Propósito |
|-----------|----------|
| **Konva.js** | Canvas 2D de alto rendimiento |
| **React-Konva** | Wrapper de React para Konva |
| **TypeScript** | Tipado estático y seguridad |
| **Tailwind CSS** | Estilos (con tema Dark Fantasy) |

---

## 2. Estado Actual del Proyecto

### 2.1 Progreso por Fases

```
FASE 1: Preparación y Limpieza       ████████████████ 100%
FASE 2: Infraestructura Base         ████████░░░░░░░░░ 50%
FASE 3: Capas de Rendering           ░░░░░░░░░░░░░░░░░  0%
FASE 4: Interacción Básica           ░░░░░░░░░░░░░░░░░  0%
FASE 5: UI Avanzada                    ░░░░░░░░░░░░░░░░░  0%
FASE 6: Features Premium               ░░░░░░░░░░░░░░░░░░  0%
```

### 2.2 Tareas Completadas

#### ✅ FASE 1: Preparación y Limpieza (100%)
- [x] Eliminar Mapa 2D actual (placeholder)
- [x] Instalar dependencias Konva
- [x] Crear tipos TypeScript completos

#### ✅ FASE 2: Infraestructura Base (50%)
- [x] Implementar Stage y Viewport
- [x] Crear Sistema de Capas
- [ ] ⏳ Crear Sistema de Coordenadas (EN PROCESO)

### ⏳ FASE 3-6: Pendientes
- [ ] Layer de Fondo
- [ ] Layer de Pueblos/Zonas
- [ ] Layer de Edificios ⭐ **PRÓXIMA TAREA**
- [ ] Layer de NPCs
- [ ] Layer de UI
- [ ] Interacción Básica
- [ ] UI Avanzada
- [ ] Features Premium

---

## 3. Arquitectura del Sistema

### 3.1 Estructura de Archivos

```
src/
├── lib/
│   └── map/
│       ├── types.ts              # Tipos TypeScript completos
│       ├── useViewport.ts         # Hook para pan/zoom
│       ├── useLayers.ts          # Hook para gestión de capas
│       ├── coordUtils.ts         # Utilidades de coordenadas
│       └── index.ts             # Exportaciones
├── components/
│   └── map/
│       ├── MapStage.tsx          # Stage de Konva (canvas)
│       ├── LayerControl.tsx      # UI de control de capas
│       └── index.ts             # Exportaciones
└── dashboard/
    └── MapTab.tsx              # Tab principal (placeholder actual)
```

### 3.2 Flujo de Datos

```
┌─────────────────────────────────────────────────────┐
│  MapTab.tsx (Tab Principal)                   │
└────────────┬──────────────────────────────────────┘
             │
             ├────────────────────────────────┐
             │  MapStage.tsx            │
             │  (Canvas Konva 2D)      │
             │                          │
             │  ┌──────────────────────┐  │
             │  │ useViewport       │  │
             │  │ - Pan            │  │
             │  │ - Zoom           │  │
             │  │ - Centrado       │  │
             │  └──────────────────────┘  │
             │                          │
             │  ┌──────────────────────┐  │
             │  │ useLayers        │  │
             │  │ - Visibilidad     │  │
             │  │ - Opacidad        │  │
             │  │ - Bloqueo        │  │
             │  └──────────────────────┘  │
             │                          │
             │  ┌──────────────────────┐  │
             │  │ coordUtils       │  │
             │  │ - Conversión     │  │
             │  │ - Detección      │  │
             │  │ - Snap grid       │  │
             │  └──────────────────────┘  │
             └───────────────────────────┘
             │
             ├────────────────────────────────┐
             │  LayerControl.tsx (UI)    │
             │  - Toggles de capas         │
             │  - Sliders de opacidad      │
             │  - Presets rápidos          │
             └────────────────────────────────┘
```

---

## 4. Biblioteca del Mapa

### 4.1 types.ts - Tipos Completos

#### Tipos de Coordenadas

```typescript
// Coordenadas en el sistema de Minecraft
interface MinecraftCoords {
  worldX: number;      // Coordenada X del mundo
  worldY?: number;     // Altura (opcional para edificios multi-piso)
  worldZ: number;      // Coordenada Z del mundo
}

// Coordenadas en píxeles del Canvas (aplicando escala)
interface PixelCoords {
  x: number;           // Coordenada X renderizada
  y: number;           // Coordenada Y renderizada
}

// Rango de coordenadas (para áreas)
interface CoordBounds {
  start: MinecraftCoords;    // Esquina inicial
  end: MinecraftCoords;      // Esquina final
}
```

#### Tipos de Viewport

```typescript
// Estado del viewport (vista visible del mapa)
interface ViewportState {
  scale: number;       // Zoom actual (1.0 = 100%)
  offsetX: number;    // Desplazamiento X en píxeles
  offsetY: number;    // Desplazamiento Y en píxeles
  width: number;      // Ancho del viewport
  height: number;     // Alto del viewport
  centerX: number;    // Centro X en píxeles
  centerY: number;    // Centro Y en píxeles
}

// Configuración de límites del viewport
interface ViewportLimits {
  minScale: number;     // Zoom mínimo (0.1 = 10%)
  maxScale: number;     // Zoom máximo (5.0 = 500%)
  defaultScale: number;  // Zoom por defecto (1.0 = 100%)
}
```

#### Tipos de Capas (Layers)

```typescript
// Tipos de capas disponibles en el mapa
type MapLayerType =
  | 'background'   // Imagen de fondo / tiles
  | 'zones'        // Zonas y pueblos (polígonos)
  | 'buildings'    // Edificios (rectángulos)
  | 'npcs'         // NPCs y players (íconos)
  | 'routes'       // Rutas y caminos
  | 'activity'     // Heatmap de actividad
  | 'ui';          // UI: tooltips, selección, bounding boxes

// Configuración de una capa
interface LayerConfig {
  id: MapLayerType;
  name: string;           // Nombre visible para usuario
  visible: boolean;        // Si la capa está visible
  locked: boolean;         // Si la capa está bloqueada (no editable)
  opacity: number;         // Opacidad (0-1)
  zIndex: number;          // Orden de renderizado
  color?: string;          // Color de referencia para la capa
}

// Estado de todas las capas
interface LayersState {
  layers: Record<MapLayerType, LayerConfig>;
  activeLayer: MapLayerType;  // Capa actualmente activa (para edición)
}
```

#### Tipos de Selección

```typescript
// Tipos de elementos seleccionables en el mapa
type SelectableType = 
  | 'building'     // Edificios
  | 'pueblo'       // Pueblos
  | 'npc'          // NPCs
  | 'zone'         // Zonas
  | 'route';       // Rutas

// Elemento seleccionable con sus datos
interface SelectableElement {
  id: string;
  type: SelectableType;
  name: string;
  coords: MinecraftCoords;
  data?: any;              // Datos adicionales según el tipo
}

// Estado de selección actual
interface SelectionState {
  selectedIds: Set<string>;      // IDs de elementos seleccionados
  hoveredId: string | null;    // ID del elemento bajo el mouse
  selectionType: 'single' | 'multiple';  // Tipo de selección
  selectionBox: SelectionBox | null;  // Caja de selección (para selección múltiple)
}

// Caja de selección para drag-box selection
interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}
```

#### Tipos de Edición

```typescript
// Modos de edición disponibles
type EditMode = 
  | 'view'      // Ver sin editar
  | 'select'    // Seleccionar elementos
  | 'create'    // Crear nuevos elementos
  | 'edit'      // Editar existentes
  | 'delete';    // Eliminar elementos

// Tipo de elemento a crear en modo edición
type CreateType = 
  | 'building' | 'zone' | 'route' | 'npc';

// Estado del modo de edición
interface EditState {
  mode: EditMode;
  createType?: CreateType;
  snapToGrid: boolean;
  gridSize: number;           // Tamaño de grilla en bloques de Minecraft
  isCreating: boolean;
  tempElement?: TemporaryElement;
}

// Elemento temporal mientras se crea
interface TemporaryElement {
  type: CreateType;
  coords: MinecraftCoords;
  complete: boolean;
}
```

### 4.2 useViewport.ts - Gestión de Pan/Zoom

```typescript
interface UseViewportReturn {
  viewport: ViewportState;
  setViewport: (updates: Partial<ViewportState>) => void;
  resetViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  handleWheel: (event: WheelEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: () => void;
  zoomToPoint: (point: { x: number; y: number }, newScale: number) => void;
  centerOnPoint: (point: { x: number; y: number }) => void;
  fitToRect: (rect: { x: number; y: number; width: number; height: number }, padding?: number) => void;
}
```

**Características implementadas:**

| Funcionalidad | Estado | Descripción |
|-------------|--------|------------|
| Zoom con rueda | ✅ | Debounce a 50ms para evitar zoom excesivo |
| Pan con arrastre | ✅ | Botón izquierdo o medio del mouse |
| Zoom centrado en puntero | ✅ | Fórmula matemática correcta para mantener el punto bajo el mouse |
| Reset de viewport | ✅ | Doble click para resetear a estado inicial |
| Límites de zoom | ✅ | Configurables (10% - 500%) |
| Overlay informativo | ✅ | Muestra zoom actual en porcentaje |
| Cursor dinámico | ✅ | Icono "grab" cuando scale > 1 |
| Resize responsivo | ✅ | Listener para ajustar tamaño del canvas |

**Fórmula de Zoom Centrado:**
```typescript
scaleRatio = clampedScale / prev.scale;
newOffsetX = point.x - (point.x - prev.offsetX) * scaleRatio;
newOffsetY = point.y - (point.y - prev.offsetY) * scaleRatio;
```

### 4.3 useLayers.ts - Gestión de Capas

```typescript
// 7 capas gestionadas:
// 1. background    - Imagen de fondo / tiles
// 2. zones         - Zonas y pueblos (polígonos)
// 3. buildings     - Edificios (rectángulos)
// 4. npcs          - NPCs y players (íconos)
// 5. routes        - Rutas y caminos
// 6. activity      - Heatmap de actividad
// 7. ui            - UI: tooltips, selección, bounding boxes
```

**Características implementadas:**

| Funcionalidad | Estado |
|-------------|--------|
| 7 capas gestionadas | ✅ |
| Toggle de visibilidad | ✅ |
| Toggle de bloqueo | ✅ |
| Slider de opacidad | ✅ |
| Capa activa tracking | ✅ |
| 3 presets rápidos | ✅ |
| Configuración por defecto | ✅ |
| Prioridad de renderizado | ✅ |

**Presets Rápidos:**

| Preset | Capas Visibles |
|--------|---------------|
| Todo | Todas las capas |
| Edificios | Solo edificios visible |
| Mapa | Solo pueblos, zonas y rutas visibles |

**Prioridad de Renderizado (zIndex):**

```
UI (zIndex: 1000)
  └─> NPCs (zIndex: 30)
      └─> Edificios (zIndex: 20)
          └─> Rutas (zIndex: 15)
              └─> Zonas (zIndex: 10)
                  └─> Fondo (zIndex: 0)
```

---

## 5. Componentes del Mapa

### 5.1 MapStage.tsx - Canvas Konva 2D

```typescript
// Componente principal que renderiza el canvas del mapa
// - Configura Stage de Konva
// - Aplica eventos de pan/zoom
// - Overlay informativo de zoom
// - Overlay de instrucciones para usuario
// - Cursor dinámico según estado
```

**Características:**
- ✅ Stage de Konva configurado con tamaño dinámico
- ✅ Eventos de mouse manejados (wheel, mousedown, mousemove, mouseup)
- ✅ Global mouseup listener para prevenir drag "pegado"
- ✅ Overlay de zoom (%) siempre visible
- ✅ Overlay de instrucciones (arrastrar para mover, rueda para zoom)
- ✅ Cursor cambia a "grab" cuando está arrastrando

### 5.2 LayerControl.tsx - UI de Control de Capas

```typescript
// Componente UI para controlar las 7 capas del mapa
// - Muestra lista de capas con toggles y sliders
// - Presets rápidos para combinar capas
// - Indicadores visuales de estado
```

**Características:**

| Control | Descripción |
|---------|------------|
| Toggle Visibilidad | Botón con icono Eye/EyeOff |
| Toggle Bloqueo | Botón con icono Lock/Unlock |
| Slider Opacidad | Slider 0-100% |
| Preset Rápidos | Botones: Todo, Edificios, Mapa |
| Estado Visual | Color indica visible/oculto/bloqueado |
| Capa Activa | Resaltada visualmente |

---

## 6. Sistema de Coordenadas

### 6.1 Conversor de Coordenadas

**CoordConverter** (en `coordUtils.ts`):

```typescript
interface CoordConverter {
  minecraftToPixel(mc: MinecraftCoords, options?: CoordTransformOptions): PixelCoords;
  pixelToMinecraft(px: PixelCoords, options?: CoordTransformOptions): MinecraftCoords;
  snapToGrid(mc: MinecraftCoords, gridSize: number): GridSnapResult;
  distance(a: MinecraftCoords, b: MinecraftCoords): number;
  normalizeRect(bounds: CoordBounds): CoordBounds;
}

interface CoordTransformOptions {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  origin?: 'center' | 'top-left';
}
```

**Funciones implementadas:**

| Función | Descripción |
|----------|------------|
| `minecraftToPixel()` | Convierte coordenadas Minecraft a píxeles aplicando scale y offset |
| `pixelToMinecraft()` | Convierte píxeles a coordenadas Minecraft |
| `snapToGrid()` | Alinea coordenadas a una grilla (bloques de Minecraft) |
| `distance()` | Calcula distancia euclidiana entre dos puntos |
| `normalizeRect()` | Normaliza un rectángulo (asegura w < h, start < end) |

### 6.2 Cálculo de Áreas

**Sistema implementado en `COORDENADAS_IMPLEMENTACION.md`:**

```typescript
// Funciones de cálculo de bounding boxes
calculateBoundingBox(areas: Area[]): Area | null
calculateBoundingBoxArea(area: Area): number
getBoundingBoxCenter(area: Area): Coords3D
calculatePuebloBoundingBox(puebloId: string): Area | null
calculateWorldBoundingBox(worldId: string): Area | null

// Funciones de actualización
updatePuebloArea(puebloId: string): Pueblo | null
updateWorldArea(worldId: string): World | null
updateAllAreas(): {...}

// API Endpoints
GET  /api/boundingBox  // Actualiza todas las áreas y devuelve estadísticas
POST /api/boundingBox  // Actualiza áreas específicas
```

**Estructura de Áreas:**

```typescript
// Edificación (coordenadas manuales)
{
  "id": "EDIF_123456",
  "worldId": "WORLD_ESPARCRAFT",
  "puebloId": "PUEBLO_789012",
  "name": "Rincon de los condenados",
  "area": {
    "start": { "x": -28, "y": 68, "z": -26 },
    "end":   { "x": 1,   "y": 86, "z": -74 }
  }
}

// Región/Pueblo (coordenadas calculadas automáticamente)
{
  "id": "PUEBLO_789012",
  "worldId": "WORLD_ESPARCRAFT",
  "name": "Hexen",
  "area": {
    "start": { "x": -28, "y": 68, "z": -74 },
    "end":   { "x": 1,   "y": 86, "z": -26 }
  }
}

// Mundo (coordenadas calculadas desde regiones)
{
  "id": "WORLD_ESPARCRAFT",
  "name": "Esparcraft",
  "area": {
    "start": { "x": -100, "y": 0,   "z": -150 },
    "end":   { "x": 200,  "y": 100, "z": 150 }
  }
}
```

**Cálculos de Bounding Box:**
- **X mínima**: Mínimo de todos los `start.x` y `end.x`
- **X máxima**: Máximo de todos los `start.x` y `end.x`
- **Y mínima**: Mínimo de todos los `start.y` y `end.y`
- **Y máxima**: Máximo de todos los `start.y` y `end.y`
- **Z mínima**: Mínimo de todos los `start.z` y `end.z`
- **Z máxima**: Máximo de todos los `start.z` y `end.z`

**Área del bounding box:**
```typescript
Área = |end.x - start.x| × |end.z - start.z|
```

**Centro del bounding box:**
```typescript
Center.x = (start.x + end.x) / 2
Center.y = (start.y + end.y) / 2
Center.z = (start.z + end.z) / 2
```

---

## 7. Funcionalidades Implementadas

### 7.1 Viewport y Navegación

| Funcionalidad | Estado | Implementación |
|-------------|--------|---------------|
| Zoom con rueda del mouse | ✅ | Debounce 50ms, límites 10%-500% |
| Pan con arrastre del mouse | ✅ | Botón izquierdo o medio |
| Zoom centrado en puntero | ✅ | Fórmula matemática correcta |
| Reset de viewport | ✅ | Doble click para resetear |
| Límites configurables | ✅ | 10%-500% por defecto |
| Overlay informativo | ✅ | Muestra % de zoom |
| Cursor dinámico | ✅ | "grab" cuando scale > 1 |
| Resize responsivo | ✅ | Listener de resize |

### 7.2 Sistema de Capas

| Funcionalidad | Estado | Implementación |
|-------------|--------|---------------|
| 7 capas gestionadas | ✅ | background, zones, buildings, npcs, routes, activity, ui |
| Toggle visibilidad | ✅ | Botón con icono Eye/EyeOff |
| Toggle bloqueo | ✅ | Botón con icono Lock/Unlock |
| Slider opacidad | ✅ | 0-100% para cada capa |
| 3 presets rápidos | ✅ | Todo, Edificios, Mapa |
| Capa activa tracking | ✅ | Resaltada visualmente |
| Prioridad de renderizado | ✅ | zIndex de 0 a 1000 |
| Configuración por defecto | ✅ | DEFAULT_LAYERS en types.ts |

### 7.3 Coordenadas y Áreas

| Funcionalidad | Estado | Implementación |
|-------------|--------|---------------|
| Conversor Minecraft ↔ Pixels | ✅ | CoordConverter con transformaciones bidireccionales |
| Snap a grilla | ✅ | Función snapToGrid() |
| Cálculo de distancias | ✅ | distance() euclidiana |
| Normalización de rectángulos | ✅ | normalizeRect() |
| Detección de colisiones | ✅ | pointInRect(), rectsIntersect() |
| Cálculo de bounding boxes | ✅ | Para edificaciones, pueblos y mundos |
| Actualización de áreas | ✅ | API endpoint /api/boundingBox |
| Visualización en UI | ✅ | Botones en MundosSection y PueblosSection |

---

## 8. Funcionalidades Pendientes

### 8.1 FASE 3: Capas de Rendering (0% completado)

| Tarea | Prioridad | Estado | Descripción |
|-------|-----------|--------|------------|
| Layer de Fondo | Media | ⏳ | Cargar imagen de fondo, soporte para tiles opcional |
| Layer de Pueblos/Zonas | Media | ⏳ | Renderizar polígonos para pueblos y zonas |
| Layer de Edificios | Alta | ⏳ | Renderizar edificios como rectángulos con coordenadas Minecraft |
| Layer de NPCs | Media | ⏳ | Renderizar NPCs como íconos con labels |
| Layer de UI | Media | ⏳ | Tooltips, selección, bounding boxes |

### 8.2 FASE 4: Interacción Básica (0% completado)

| Tarea | Prioridad | Estado | Descripción |
|-------|-----------|--------|------------|
| Hit Detection | Alta | ⏳ | Detectar clicks en edificios/NPCs |
| Selección Simple/Múltiple | Media | ⏳ | Click y Shift+click |
| Drag Box Selection | Baja | ⏳ | Selección arrastrando caja |

### 8.3 FASE 5: UI Avanzada (0% completado)

| Tarea | Prioridad | Estado | Descripción |
|-------|-----------|--------|------------|
| Tooltips | Media | ⏳ | Mostrar al hacer hover |
| Highlight Visual | Media | ⏳ | Resaltar elementos seleccionados |
| Toggles de Capas | Media | ⏳ | Integrar LayerControl en el mapa |
| Search Box | Media | ⏳ | Buscar y filtrar elementos |
| Highlight por Estado | Media | ⏳ | Integrar con /api/sessions |
| Panel Lateral | Media | ⏳ | Detalles del elemento seleccionado |
| Botones de Acción | Media | ⏳ | Botones rápidos en SidePanel |

### 8.4 FASE 6: Features Premium (0% completado)

| Tarea | Prioridad | Estado | Descripción |
|-------|-----------|--------|------------|
| Edición - Crear Rectángulo | Baja | ⏳ | Herramienta para dibujar rectángulos |
| Edición - Crear Polígono | Baja | ⏳ | Herramienta para dibujar polígonos |
| Edición - Drag Handles | Baja | ⏳ | Redimensionar edificios con handles |
| Edición - Snap a Grilla | Baja | ⏳ | Snap opcional durante edición |
| Lock Layers | Baja | ⏳ | Bloquear capas para evitar cambios accidentales |
| Persistencia de Cambios | Alta | ⏳ | Guardar cambios al editar, auto-save |
| Heatmap de Actividad | Baja | ⏳ | Visualizar actividad por edificio |
| Timeline Scrub | Baja | ⏳ | Ver mapa en diferentes momentos del tiempo |

---

## 9. Integración con APIs

### 9.1 APIs Existentes

| Endpoint | Método | Descripción |
|----------|---------|------------|
| `/api/pueblos` | GET | Obtener todos los pueblos |
| `/api/pueblos/[id]` | GET | Obtener pueblo específico |
| `/api/edificios` | GET | Obtener todos los edificios |
| `/api/edificios/[id]` | GET | Obtener edificio específico |
| `/api/edificios/[id]/memory` | GET | Obtener memoria del edificio |
| `/api/npcs` | GET | Obtener todos los NPCs |
| `/api/npcs/[id]` | GET | Obtener NPC específico |
| `/api/npcs/[id]/memory` | GET | Obtener memoria del NPC |
| `/api/worlds` | GET | Obtener todos los mundos |
| `/api/worlds/[id]` | GET | Obtener mundo específico |
| `/api/worlds/[id]/memory` | GET | Obtener memoria del mundo |
| `/api/boundingBox` | GET | Actualizar todas las áreas |
| `/api/boundingBox` | POST | Actualizar áreas específicas |

### 9.2 Flujo de Integración

```
┌─────────────────────────────────────────────────────┐
│  Layer de Edificios (pendiente)              │
│  ────────────────────────────────────────       │
│                                               │
│  1. GET /api/edificios                  │
│     → Obtiene todos los edificios          │
│                                               │
│  2. Transformar coordenadas                 │
│     → MinecraftCoords → PixelCoords         │
│     → Usar coordUtils.minecraftToPixel()  │
│                                               │
│  3. Renderizar en Konva                     │
│     → Rectángulos con coordenadas          │
│     → Colores según tipo de edificio      │
│     → Hover highlights                   │
│     → Labels con nombres                  │
│                                               │
│  4. Integrar selección                     │
│     → Click para seleccionar               │
│     → Shift+click para selección múltiple │
│     → Bounding boxes alrededor de seleccionados│
│                                               │
│  5. Mostrar tooltips                       │
│     → Al hacer hover mostrar información    │
│     → Nombre, tipo, ID, datos extra    │
│                                               │
└───────────────────────────────────────────────┘
```

### 9.3 Estructura de Datos de APIs

#### Edificio
```json
{
  "id": "EDIF_123456",
  "worldId": "WORLD_ESPARCRAFT",
  "puebloId": "PUEBLO_789012",
  "name": "Rincón de los condenados",
  "tipo": "tienda",
  "coords": {
    "start": { "x": -28, "y": 68, "z": -26 },
    "end":   { "x": 1,   "y": 86, "z": -74 }
  },
  "area": {
    "start": { "x": -28, "y": 68, "z": -26 },
    "end":   { "x": 1,   "y": 86, "z": -74 }
  }
}
```

#### NPC
```json
{
  "id": "NPC_1768825922617",
  "name": "Gandalf el Gris",
  "raza": "Humano",
  "clase": "Mago",
  "coords": { "x": 100, "y": 68, "z": -50 },
  "worldId": "WORLD_ESPARCRAFT",
  "puebloId": "PUEBLO_789012"
}
```

#### Pueblo
```json
{
  "id": "PUEBLO_789012",
  "name": "Hexen",
  "type": "ciudad",
  "worldId": "WORLD_ESPARCRAFT",
  "area": {
    "start": { "x": -28, "y": 68, "z": -74 },
    "end":   { "x": 1,   "y": 86, "z": -26 }
  },
  "edificiosCount": 15
}
```

---

## 10. Guía de Desarrollo

### 10.1 Cómo Implementar una Capa

#### Paso 1: Crear el componente de renderizado

```typescript
// src/components/map/layers/BuildingsLayer.tsx
import { Layer } from 'react-konva';
import { useViewport } from '@/lib/map/useViewport';
import { MapBuilding } from '@/lib/map/types';

interface BuildingsLayerProps {
  buildings: MapBuilding[];
  visible: boolean;
  opacity: number;
}

export function BuildingsLayer({ buildings, visible, opacity }: BuildingsLayerProps) {
  const { viewport } = useViewport();

  if (!visible || !buildings.length) return null;

  return (
    <Layer name="buildings" opacity={opacity}>
      {buildings.map((building) => {
        const pixelCoords = minecraftToPixel(
          building.coords,
          { scale: viewport.scale, offsetX: viewport.offsetX, offsetY: viewport.offsetY }
        );

        return (
          <Rect
            key={building.id}
            x={pixelCoords.x}
            y={pixelCoords.y}
            width={building.size.width * viewport.scale}
            height={building.size.length * viewport.scale}
            fill={building.selected ? ELEMENT_COLORS.building.selected : ELEMENT_COLORS.building.default}
            stroke={building.selected ? ELEMENT_COLORS.SELECTION_BORDER_COLOR : building.borderColor}
            strokeWidth={building.selected ? ELEMENT_COLORS.SELECTION_BORDER_WIDTH : 2}
            onMouseEnter={() => handleHover(building.id)}
            onMouseLeave={() => handleHover(null)}
            onClick={(e) => handleClick(e, building)}
          />
        );
      })}
    </Layer>
  );
}
```

#### Paso 2: Integrar en MapStage.tsx

```typescript
// src/components/map/MapStage.tsx
import BuildingsLayer from './layers/BuildingsLayer';

export function MapStage() {
  const [buildings, setBuildings] = useState<MapBuilding[]>([]);
  
  // Cargar edificios desde la API
  useEffect(() => {
    fetch('/api/edificios')
      .then(res => res.json())
      .then(data => setBuildings(data))
      .catch(console.error);
  }, []);

  return (
    <Stage ...>
      {/* Otras capas */}
      <BuildingsLayer
        buildings={buildings}
        visible={layers.buildings.visible}
        opacity={layers.buildings.opacity}
      />
    </Stage>
  );
}
```

### 10.2 Cómo Implementar Selección de Elementos

```typescript
// En el componente de la capa
const handleSelection = (e: Konva.KonvaEventObjectEvent, element: MapBuilding) => {
  const isShiftKey = (e.evt as KeyboardEvent)?.shiftKey;
  
  if (isShiftKey) {
    // Selección múltiple
    setSelectedIds(prev => new Set([...prev, element.id]));
  } else {
    // Selección simple (deseleccionar otros)
    setSelectedIds(new Set([element.id]));
  }
};

// En el rectángulo del edificio
<Rect
  onClick={(e) => handleSelection(e, building)}
  // ...
/>
```

### 10.3 Cómo Implementar Tooltips

```typescript
// src/components/map/Tooltip.tsx
import { Html } from 'react-konva';

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  element: SelectableElement;
}

export function Tooltip({ visible, x, y, element }: TooltipProps) {
  if (!visible) return null;

  return (
    <Html>
      <div
        style={{
          position: 'absolute',
          left: x + 15,
          top: y,
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 1000
        }}
        className="pixel-panel p-3"
      >
        <h4 className="text-sm font-bold mb-1">{element.name}</h4>
        <p className="text-xs text-muted-foreground">ID: {element.id}</p>
        <p className="text-xs text-muted-foreground">Tipo: {element.type}</p>
        {element.description && (
          <p className="text-xs text-muted-foreground mt-2">{element.description}</p>
        )}
      </div>
    </Html>
  );
}
```

### 10.4 Constantes del Mapa

```typescript
// src/lib/map/types.ts
export const MAP_CONSTANTS = {
  DEFAULT_BLOCK_SIZE: 10,        // 10 bloques = 1 unidad visual
  ZOOM_MIN: 0.1,                 // 10% zoom
  ZOOM_MAX: 5.0,                 // 500% zoom
  ZOOM_STEP: 0.1,                // +/- 10%
  DEFAULT_GRID_SIZE: 1,           // 1 bloque de Minecraft
  SELECTION_COLOR: '#3b82f6',
  SELECTION_BORDER_COLOR: '#2563eb',
  SELECTION_BORDER_WIDTH: 2,
  HOVER_COLOR: 'rgba(59, 130, 246, 0.2)',
  HOVER_BORDER_COLOR: 'rgba(59, 130, 246, 0.5)',
  ANIMATION_DURATION: 150,         // ms
  DEBOUNCE_DELAY: 100,            // ms
} as const;
```

### 10.5 Colores por Tipo de Elemento

```typescript
// src/lib/map/types.ts
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
```

---

## 📊 Estadísticas del Código

### Librería del Mapa

| Archivo | Líneas | Descripción |
|---------|--------|------------|
| types.ts | ~500 | Tipos TypeScript completos |
| useViewport.ts | ~350 | Hook para pan/zoom |
| useLayers.ts | ~250 | Hook para gestión de capas |
| coordUtils.ts | ~200 | Utilidades de coordenadas |
| index.ts | ~15 | Exportaciones |
| **Total** | ~1315 | Líneas de código |

### Componentes del Mapa

| Archivo | Líneas | Descripción |
|---------|--------|------------|
| MapStage.tsx | ~200 | Stage de Konva |
| LayerControl.tsx | ~200 | UI de control de capas |
| index.ts | ~10 | Exportaciones |
| **Total** | ~410 | Líneas de código |

---

## 🎯 Próxima Tarea Sugerida

Según el TODO.md, la próxima tarea más importante es:

### **Tarea 4-c: Layer de Edificios** ⭐ ALTA PRIORIDAD

**Prioridad**: Alta  
**Estado**: Pendiente

**Descripción**: Renderizar edificios como rectángulos con coordenadas Minecraft

**Implementación requerida**:
1. Cargar datos de edificios desde `/api/edificios`
2. Transformar coordenadas Minecraft a píxeles
3. Renderizar rectángulos con colores por tipo de edificio
4. Implementar hover highlight
5. Mostrar labels con nombres de edificios
6. Integrar con selección del mapa
7. Mostrar indicadores de edificios con eventos recientes

**Beneficios de implementar esta tarea**:
- ✅ Visualizar todos los edificios de tu servidor
- ✅ Navegar entre pueblos y ver edificios
- ✅ Comenzar a usar el mapa de forma práctica
- ✅ Probar todas las demás funcionalidades (selección, tooltips, etc.)
- ✅ Base sólida para implementar el resto de capas

---

## 📝 Notas Adicionales

### Sobre la Visualización con Tema Dark Fantasy

Al implementar las capas del mapa, debes seguir las reglas del tema:

1. **Bordes duros**: Usar `border: 2px solid` (sin rounded)
2. **Sombras pixel**: Usar `box-shadow: 2px 2px 0px rgba(0,0,0,1)`
3. **Colores del tema**:
   - Edificios: `#3b82f6` (primary) o `#f59e0b` (para destacar)
   - Pueblos: `#22c55e`
   - NPCs: `#f59e0b`
   - Rutas: `#ec4899`
   - Zonas: `#64748b`
4. **Tooltips**: Usar `PixelPanel` con estética grimorio
5. **Labels**: Fuente VT323, color `#B8B8B8`

### Coordenadas Minecraft vs Píxeles

El sistema usa dos sistemas de coordenadas:

1. **Coordenadas Minecraft**: 
   - `worldX`, `worldY`, `worldZ`
   - Usadas en la base de datos
   - Coordenadas reales del mundo del juego

2. **Coordenadas Píxeles**:
   - `x`, `y` (Canvas)
   - Calculadas aplicando `scale`, `offsetX`, `offsetY`
   - Usadas para renderizar en Konva

**Transformación**:
```typescript
minecraftToPixel(mc: MinecraftCoords, options: {
  scale: viewport.scale,
  offsetX: viewport.offsetX,
  offsetY: viewport.offsetY
}): PixelCoords {
  // Convierte coordenadas del mundo a píxeles del canvas
  return {
    x: (mc.worldX - originX) * scale + centerX,
    y: (mc.worldZ - originZ) * scale + centerY
  };
}
```

---

## 🚀 Cómo Continuar el Desarrollo

### Opción 1: Continuar con el Layer de Edificios

Esta es la tarea más importante según la documentación:

```typescript
// 1. Crear el componente de la capa
// src/components/map/layers/BuildingsLayer.tsx

// 2. Integrar en MapStage.tsx
// src/components/map/MapStage.tsx

// 3. Probar funcionalidad
// - Renderizado correcto
// - Coordenadas transformadas
// - Hover highlights
// - Selección simple
// - Tooltips informativos
```

### Opción 2: Revisar la Documentación

Los archivos clave para entender el sistema son:

1. **`TODO.md`** - Estado completo del proyecto y próximas tareas
2. **`COORDENADAS_IMPLEMENTACION.md`** - Sistema de coordenadas y áreas
3. **`src/lib/map/types.ts`** - Tipos TypeScript completos
4. **`src/lib/map/useViewport.ts`** - Hook para pan/zoom
5. **`src/lib/map/useLayers.ts`** - Hook para gestión de capas
6. **`PIXEL_ART_THEME_GUIDE.md`** - Guía del estilo Dark Fantasy

### Opción 3: Prioridades Sugeridas

1. **Alta Prioridad**:
   - Implementar Layer de Edificios
   - Probar selección y tooltips
   - Integrar con todas las capas existentes

2. **Media Prioridad**:
   - Layer de NPCs
   - Layer de Pueblos/Zonas
   - Layer de Fondo

3. **Baja Prioridad**:
   - Features de edición premium
   - Heatmap de actividad
   - Timeline scrub

---

**Versión**: 1.0.0  
**Fecha**: 2025  
**Autor**: Z.ai Code  
**Proyecto**: Bridge IA — Mapa 2D Interactivo

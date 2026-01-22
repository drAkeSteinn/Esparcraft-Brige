# 🗺️ Implementación del Mapa Interactivo - Esparcraft Bridge

**Fecha de creación:** 2025-01-22  
**Estado:** Plan completo listo para implementación  
**Tecnología:** Canvas 2D (Konva / react-konva)

---

## 📋 Índice

1. [Resumen del Plan](#resumen-del-plan)
2. [Estado Actual](#estado-actual)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Fases de Implementación](#fases-de-implementación)
5. [Detalles Técnicos](#detalles-técnicos)
6. [Prerequisitos](#prerequisitos)
7. [Pasos Detallados](#pasos-detallados)

---

## 📊 Resumen del Plan

### Objetivo

Integrar un **mapa interactivo 2D** con lo que ya existe en el universo:
- Mundos
- Regiones (Pueblos/Naciones)
- Edificaciones
- NPCs
- Tipos de lugares

### Decisión Tecnológica

**Elección:** Canvas 2D (Konva / react-konva)

**Justificación:**
- ✅ Pan/zoom súper fluido
- ✅ Seleccionar edificios/NPCs con click
- ✅ Dibujar polígonos (zonas), rectángulos (edificios), íconos (NPCs), labels
- ✅ Overlays (capas: pueblos, edificios, rutas, "heatmap" de actividad)
- ✅ Hit detection eficiente
- ✅ Capas y z-index sin dolor
- ✅ Rinde bien con cientos/miles de shapes

### Enfoque Único para NPCs

**Decisión clave:** Los NPCs se mostrarán DENTRO de los edificios, no con coordenadas propias.

**Ventajas:**
- ✅ Más lógico: Los NPCs viven en edificios
- ✅ Más simple: Menos código, menos mantenimiento
- ✅ Más robusto: Menos posibilidades de errores
- ✅ Más consistente: Siempre sincronizado con el edificio

---

## ✅ Estado Actual

### Lo que YA TIENES implementado (~50% completoto)

#### 1. Sistema de Tipos Completo ✅
**Archivo:** `src/lib/map/types.ts` (531 líneas)

**Contenido:**
- ✅ Tipos de coordenadas (MinecraftCoords, PixelCoords, CoordBounds)
- ✅ Tipos de Viewport (ViewportState, ViewportLimits)
- ✅ Tipos de Capas (7 layers con configuración completa)
- ✅ Tipos de Selección (SelectableType, SelectionState, SelectionBox)
- ✅ Tipos de Edición (EditMode, CreateType, EditState)
- ✅ Tipos de Tooltip (TooltipState, TooltipContent)
- ✅ Estado principal (Map2DState, MapSearchState)
- ✅ Tipos de elementos renderizados (MapBuilding, MapNPC, MapZone, MapRoute)
- ✅ Tipos de eventos (MapZoomEvent, MapPanEvent, MapClickEvent, MapHoverEvent, MapSelectionEvent)
- ✅ Constantes (MAP_CONSTANTS, ELEMENT_COLORS, DEFAULT_LAYERS)

#### 2. Utilidades de Coordenadas ✅
**Archivo:** `src/lib/map/coordUtils.ts` (277 líneas)

**Funciones:**
- ✅ `coordConverter` - Conversión bidireccional Minecraft ↔ Pixels
- ✅ `transformCoordsToPixels` - Transformar array de coords a pixels
- ✅ `transformPixelsToMinecraft` - Transformar array de pixels a Minecraft
- ✅ `getRectCenter` - Calcular centro de rectángulo
- ✅ `getRectArea` - Calcular área de rectángulo
- ✅ `pointInRect` - Hit detection punto en rectángulo
- ✅ `rectsIntersect` - Intersección de rectángulos
- ✅ `snapToGrid` - Snap a grilla
- ✅ `getBoundingBox` - Bounding box de puntos
- ✅ Y más utilidades de clonación, comparación, offset

#### 3. Sistema de Viewport (Zoom/Pan) ✅
**Archivo:** `src/lib/map/useViewport.ts` (calculado en implementación anterior)

**Funcionalidades:**
- ✅ Zoom con rueda del mouse (debounced a 100ms)
- ✅ Pan con arrastre del mouse
- ✅ Zoom centrado en puntero del mouse
- ✅ Límites de zoom configurables (10% - 500%)
- ✅ Reset de viewport con doble click
- ✅ Overlay informativo de zoom (% actual)
- ✅ Overlay de instrucciones para usuario
- ✅ Cursor dinámico (grab cuando scale > 1)

#### 4. Sistema de Capas ✅
**Archivo:** `src/lib/map/useLayers.ts` (calculado en implementación anterior)

**Funcionalidades:**
- ✅ 7 capas gestionadas: background, zones, buildings, npcs, routes, activity, ui
- ✅ Toggle de visibilidad para cada capa
- ✅ Toggle de bloqueo para cada capa (excepto UI)
- ✅ Slider de opacidad para cada capa (0-100%)
- ✅ Capa activa tracking
- ✅ 3 presets rápidos (Todo, Edificios, Solo Mapa)

#### 5. Componentes Base del Mapa ✅
**Archivo:** `src/components/map/MapStage.tsx` (193 líneas)

**Contenido:**
- ✅ Stage Konva con pan/zoom
- ✅ Manejo de eventos de mouse
- ✅ Overlay de zoom e instrucciones
- ✅ Cursor dinámico según estado

**Archivo:** `src/components/map/LayerControl.tsx` (203 líneas)

**Contenido:**
- ✅ Panel con toggles de todas las capas
- ✅ Presets rápidos
- ✅ Sliders de opacidad
- ✅ Toggle de bloqueo
- ✅ Información de ayuda

#### 6. Sistema de Coordenadas Automático ✅
**Archivos:**
- `src/lib/boundingBoxUtils.ts` (222 líneas)
- `src/app/api/boundingBox/route.ts` (API endpoint)

**Funcionalidades:**
- ✅ Calcular bounding boxes de pueblos desde edificaciones
- ✅ Calcular bounding boxes de mundos desde pueblos
- ✅ Actualizar todas las áreas en lote
- ✅ API endpoints para actualización manual
- ✅ UI con botón "Actualizar Áreas" en Mundos y Pueblos

#### 7. Tipos de Lugares Completos ✅
**Total:** 33 tipos de lugares

**Categorías:**
- 🏠 Mobiliario y Decoración (10 tipos)
- 🚪 Entradas y Salidas (2 tipos)
- 🔨 Estaciones de Trabajo (3 tipos)
- 🍳 Servicios e Instalaciones (3 tipos)
- ⚔️ Armamento y Protección (3 tipos)
- 🏰 Estructuras y Locaciones (6 tipos)
- 🔮 Magia y Misterio (5 tipos)
- 📝 Información (1 tipo)

#### 8. Datos de Prueba ✅
**Ubicación:** `data-esparcraft/`

**Contenido:**
- ✅ 2 edificios con coordenadas completas
- ✅ 4 NPCs con estructura location
- ✅ 2 pueblos/naciones
- ✅ 1 mundo (Esparcraft)
- ✅ 33 tipos de lugares

---

## 🏗️ Arquitectura Propuesta

### Estructura de Componentes

```
MapTab (principal)
└── MapStage (viewport Konva)
    ├── Layer (zIndex: 0)
    │   └── LayerFondo
    ├── Layer (zIndex: 10)
    │   └── LayerZones (pueblos con bounding boxes)
    ├── Layer (zIndex: 15)
    │   └── LayerRutas (opcional, futuro)
    ├── Layer (zIndex: 20) ⭐ MÁS IMPORTANTE
    │   └── LayerEdificios
    │       ├── EdificioRect
    │       ├── NPCs dentro del edificio
    │       └── Puntos de interés (POIs)
    ├── Layer (zIndex: 25)
    │   └── LayerActividad (heatmap, futuro)
    ├── Layer (zIndex: 30)
    │   └── LayerNPCs (solo NPCs fuera de edificios)
    └── Layer (zIndex: 1000)
        ├── LayerTooltips
        └── LayerSelección (bounding boxes)
```

### Flujo de Datos

```
API (/api/edificios)
    ↓
LayerEdificios (estado local)
    ↓
EdificioRect (componente render)
    ↓
NPCs filtrados por edificio
    ↓
NPCMarker (dentro del edificio)
```

### Normalización de Coordenadas

**Source of Truth:** Coordenadas Minecraft (worldX, worldY, worldZ)

**Conversión a Pixels:**
```typescript
x = worldX * scale + offsetX
y = worldZ * scale + offsetY
```

**Ventajas:**
- ✅ Si cambias zoom o fondo, no rompes nada
- ✅ Coordenadas Minecraft persisten tal cual
- ✅ Fácil snap a grilla (bloques de Minecraft)

---

## 🎯 Fases de Implementación

### 🟢 FASE 1: Completar Capas de Render (MVP - 6-8 horas)

#### Tarea 1: Layer de Fondo (1-2 horas)

**Objetivo:** Mostrar imagen o grid del mundo

**Pasos:**
1. Crear `src/components/map/layers/LayerFondo.tsx`
2. Cargar imagen del mundo o mostrar grid de tiles
3. Renderizar en Layer background (zIndex: 0)
4. Manejar zoom/pan a través del Stage

**Entregables:**
- Componente `LayerFondo.tsx`
- Imagen del mundo renderizada
- Grid de coordenadas opcional

---

#### Tarea 2: Layer de Edificios con NPCs ⭐ MÁS IMPORTANTE (2-3 horas)

**Objetivo:** Renderizar edificios como rectángulos con NPCs dentro

**Pasos:**
1. Crear `src/components/map/layers/LayerEdificios.tsx`
2. Cargar edificios desde `/api/edificios`
3. Cargar NPCs desde `/api/npcs`
4. Filtrar NPCs por edificio (location.edificioId)
5. Convertir coordenadas Minecraft → Pixels usando `CoordConverter`
6. Renderizar rectángulos con colores por tipo de edificio
7. Distribuir NPCs dentro de cada edificio
8. Renderizar puntos de interés (POIs) con sus iconos
9. Implementar hover highlight (cambio de color/borde)
10. Implementar hit detection para selección
11. Mostrar labels con nombres de edificios

**Estructura del componente:**
```typescript
interface LayerEdificiosProps {
  visible: boolean;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect: (edificio: Edificio) => void;
  onHover: (edificio: Edificio | null) => void;
}

export function LayerEdificios({ 
  visible, opacity, scale, offsetX, offsetY,
  onSelect, onHover 
}: LayerEdificiosProps) {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  
  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      const [edifRes, npcRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/npcs')
      ]);
      
      setEdificios(await edifRes.json().then(r => r.data));
      setNpcs(await npcRes.json().then(r => r.data));
    };
    
    fetchData();
  }, []);
  
  // Filtrar NPCs por edificio
  const getNPCsDelEdificio = (edificioId: string): NPC[] => {
    return npcs.filter(npc => 
      npc.location.edificioId === edificioId
    );
  };
  
  // Distribuir NPCs dentro del edificio
  const posicionarNPCsEnEdificio = (
    edificio: Edificio,
    npcs: NPC[]
  ): Array<{ npc: NPC; x: number; y: number }> => {
    const buildingWidth = Math.abs(edificio.area.end.x - edificio.area.start.x);
    const buildingDepth = Math.abs(edificio.area.end.z - edificio.area.start.z);
    
    return npcs.map((npc, index) => {
      const cols = Math.ceil(Math.sqrt(npcs.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const spacingX = buildingWidth / (cols + 1);
      const spacingY = buildingDepth / (cols + 1);
      
      return {
        npc,
        x: edificio.area.start.x + (col + 1) * spacingX,
        y: edificio.area.start.z + (row + 1) * spacingY
      };
    });
  };
  
  if (!visible) return null;
  
  return (
    <Layer opacity={opacity}>
      {edificios.map(edificio => {
        const npcsDelEdificio = getNPCsDelEdificio(edificio.id);
        const npcsPosicionados = posicionarNPCsEnEdificio(edificio, npcsDelEdificio);
        
        // Convertir coordenadas Minecraft a Pixels
        const pixels = coordConverter.minecraftToPixel(
          { worldX: edificio.area.start.x, worldZ: edificio.area.start.z },
          { scale, offsetX, offsetY }
        );
        
        const width = Math.abs(edificio.area.end.x - edificio.area.start.x) * scale;
        const depth = Math.abs(edificio.area.end.z - edificio.area.start.z) * scale;
        
        return (
          <Group key={edificio.id}>
            {/* Rectángulo del edificio */}
            <Rect
              x={pixels.x}
              y={pixels.y}
              width={width}
              height={depth}
              fill={ELEMENT_COLORS.building.default}
              stroke={ELEMENT_COLORS.building.default}
              strokeWidth={2}
              onMouseEnter={() => onHover(edificio)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(edificio)}
            />
            
            {/* NPCs dentro del edificio */}
            {npcsPosicionados.map(({ npc, x, y }) => {
              const npcPixels = coordConverter.minecraftToPixel(
                { worldX: x, worldZ: y },
                { scale, offsetX, offsetY }
              );
              
              return (
                <NPCMarker
                  key={npc.id}
                  npc={npc}
                  x={npcPixels.x}
                  y={npcPixels.y}
                  size={12}
                />
              );
            })}
            
            {/* Puntos de interés */}
            {edificio.puntosDeInteres?.map(poi => {
              const poiPixels = coordConverter.minecraftToPixel(
                { 
                  worldX: poi.coordenadas.x, 
                  worldZ: poi.coordenadas.z 
                },
                { scale, offsetX, offsetY }
              );
              
              return (
                <POIMarker
                  key={poi.id}
                  poi={poi}
                  x={poiPixels.x}
                  y={poiPixels.y}
                />
              );
            })}
            
            {/* Label del nombre */}
            <Text
              x={pixels.x + width / 2}
              y={pixels.y + depth + 10}
              text={edificio.name}
              fontSize={14}
              fill="#374151"
              align="center"
            />
          </Group>
        );
      })}
    </Layer>
  );
}
```

**Entregables:**
- Componente `LayerEdificios.tsx`
- Rectángulos de edificios renderizados
- NPCs dentro de edificios distribuidos
- Puntos de interés con iconos
- Hit detection funcionando
- Hover highlight implementado

---

#### Tarea 3: Componente NPCMarker (1 hora)

**Objetivo:** Renderizar NPCs como íconos pequeños

**Pasos:**
1. Crear `src/components/map/NPCMarker.tsx`
2. Diseñar ícono circular para NPC
3. Aceptar propiedades: npc, x, y, size
4. Color según estado (opcional)

**Entregables:**
- Componente `NPCMarker.tsx`
- Íconos de NPCs renderizados

---

#### Tarea 4: Componente POIMarker (1 hora)

**Objetivo:** Renderizar puntos de interés con sus iconos de tipo

**Pasos:**
1. Crear `src/components/map/POIMarker.tsx`
2. Aceptar propiedades: poi, x, y
3. Obtener icono y color desde `placeTypes`
4. Renderizar círculo con ícono dentro

**Entregables:**
- Componente `POIMarker.tsx`
- POIs con iconos de tipos renderizados

---

### 🟡 FASE 2: UI e Interacción (4-5 horas)

#### Tarea 5: Layer de Pueblos/Zonas (2-3 horas)

**Objetivo:** Mostrar bounding boxes de pueblos/naciones

**Pasos:**
1. Crear `src/components/map/layers/LayerZonas.tsx`
2. Cargar pueblos desde `/api/pueblos`
3. Usar áreas calculadas (bounding boxes)
4. Renderizar polígonos con colores:
   - Verde para pueblos
   - Púrpura para naciones
5. Hover highlight
6. Labels con nombres

**Entregables:**
- Componente `LayerZonas.tsx`
- Zonas/pueblos renderizados con bounding boxes

---

#### Tarea 6: Layer de Tooltips (1-2 horas)

**Objetivo:** Tooltip que sigue al cursor

**Pasos:**
1. Crear `src/components/map/layers/LayerTooltips.tsx`
2. Posicionar cerca del cursor
3. Mostrar información según tipo:
   - Para edificios: nombre, NPCs dentro, POIs
   - Para NPCs: nombre, descripción
   - Para zonas: nombre, tipo
4. Desaparecer cuando sale del elemento

**Estructura:**
```typescript
<TooltipPanel
  visible={tooltip.visible}
  x={tooltip.x}
  y={tooltip.y}
  element={tooltip.element}
>
  <TooltipContent />
</TooltipPanel>
```

**Entregables:**
- Componente `LayerTooltips.tsx`
- Tooltips funcionales

---

#### Tarea 7: Panel Lateral (1-2 horas)

**Objetivo:** Panel con detalles del elemento seleccionado

**Pasos:**
1. Crear `src/components/map/SelectionPanel.tsx`
2. Mostrar JSON del elemento seleccionado
3. Botones de acción:
   - "Abrir en editor" → Navegar a pestaña correspondiente
   - "Copiar ID" → Copiar ID al portapapeles
   - "Ir a Sessions" → Filtrar por ese NPC en pestaña Sessions
4. Lista de NPCs (si es edificio)

**Entregables:**
- Componente `SelectionPanel.tsx`
- Panel lateral funcional

---

### 🟠 FASE 3: Integración Principal (2-3 horas)

#### Tarea 8: Integrar MapStage con todas las capas (1-2 horas)

**Objetivo:** Unir todos los componentes en el mapa

**Pasos:**
1. Modificar `src/components/map/MapTab.tsx`
2. Integrar todas las capas en MapStage
3. Conectar estado de selección
4. Conectar estado de tooltips
5. Manejar eventos de click y hover

**Estructura:**
```typescript
<MapStage options={{ minScale: 0.1, maxScale: 5 }}>
  <LayerFondo />
  <LayerZonas />
  <LayerEdificios />
  <LayerNPCsOutdoors />
  <LayerTooltips />
  <LayerSelección />
</MapStage>

<SelectionPanel />
<LayerControl />
```

**Entregables:**
- `MapTab.tsx` completamente funcional
- Todas las capas integradas
- Mapa interactivo completo

---

### 🟠 FASE 4: Features Adicionales (opcional - 3-5 horas)

#### Tarea 9: Búsqueda Rápida (1 hora)

**Objetivo:** Filtrar por nombre de edificio o NPC

**Pasos:**
1. Crear componente `MapSearch.tsx`
2. Input de búsqueda
3. Filtrar edificios y NPCs
4. Zoom al primer resultado
5. Mostrar tooltip con resultado

**Entregables:**
- Componente de búsqueda
- Filtrado funcionando

---

#### Tarea 10: NPCs Fuera de Edificios (1-2 horas)

**Objetivo:** Layer secundario para NPCs outdoors

**Pasos:**
1. Crear `src/components/map/layers/LayerNPCsOutdoors.tsx`
2. Filtrar NPCs con scope != 'edificio'
3. Estos SÍ necesitan coordenadas explícitas
4. Renderizar como iconos en el layer NPCs

**Nota:** Si hay NPCs con scope='pueblo' o scope='mundo', agregar:
```typescript
// A NPC interface en types.ts
interface NPCLocation {
  scope: 'mundo' | 'pueblo' | 'edificio';
  worldId: string;
  puebloId?: string;
  edificioId?: string;
  coordinates?: { // NUEVO - solo para NPCs fuera de edificios
    x: number;
    y: number;
    z: number;
  };
}
```

**Entregables:**
- Layer para NPCs outdoors
- Soporte para coordenadas explícitas

---

### 🔴 FASE 5: Modo Edición (opcional - 6-8 horas)

#### Tarea 11: Crear Rectángulos (2-3 horas)

**Objetivo:** Herramienta para dibujar edificios

**Pasos:**
1. Agregar modo edición "create" al estado
2. Activar con botón en toolbar
3. Dibujar rectángulo arrastrando el mouse
4. Snap a grilla opcional
5. Guardar al API al soltar
6. Recalcular áreas de pueblos automáticamente

**Entregables:**
- Modo edición create
- Creación de edificios desde el mapa

---

#### Tarea 12: Drag Handles (2-3 horas)

**Objetivo:** Redimensionar edificios

**Pasos:**
1. Activar modo edición "edit"
2. Agregar handles en esquinas de rectángulos
3. Permitir redimensionamiento
4. Actualizar coordenadas al API
5. Recalcular áreas automáticamente

**Entregables:**
- Modo edición edit
- Redimensionamiento de edificios

---

#### Tarea 13: Snap a Grilla (1 hora)

**Objetivo:** Snap a bloques de Minecraft

**Pasos:**
1. Toggle en LayerControl para activar/desactivar
2. Usar función `snapToGrid` de coordUtils
3. Aplicar a todas las coordenadas de edición
4. Grid size configurable (1, 5, 10 bloques)

**Entregables:**
- Snap a grilla funcional
- Toggle de snap

---

### 🔵 FASE 6: Features Premium (opcional - 8-10 horas)

#### Tarea 14: Heatmap de Actividad (3-4 horas)

**Objetivo:** Visualizar actividad por edificio

**Pasos:**
1. Integrar con `/api/sessions`
2. Calcular "hotspots" por edificio
3. Renderizar overlay en LayerActivity
4. Colores del rojo (alta) a verde (baja)
5. Leyenda de intensidad

**Entregables:**
- Heatmap de actividad
- Visualización de dónde está pasando algo

---

#### Tarea 15: Timeline Scrub (3-4 horas)

**Objetivo:** Ver mapa en diferentes momentos

**Pasos:**
1. Crear componente Timeline
2. Barra slider con fechas
3. Navegar por tiempo
4. Mostrar estados históricos del mapa
5. Si no hay versionado, placeholder para futuro

**Entregables:**
- Componente Timeline
- Navegación temporal

---

## 🛠️ Detalles Técnicos

### Posicionamiento de NPCs dentro de Edificios

**Algoritmo de distribución en grid:**
```typescript
const posicionarNPCsEnEdificio = (
  edificio: Edificio,
  npcs: NPC[]
): Array<{ npc: NPC; x: number; y: number }> => {
  const buildingWidth = Math.abs(edificio.area.end.x - edificio.area.start.x);
  const buildingDepth = Math.abs(edificio.area.end.z - edificio.area.start.z);
  
  return npcs.map((npc, index) => {
    const cols = Math.ceil(Math.sqrt(npcs.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const spacingX = buildingWidth / (cols + 1);
    const spacingY = buildingDepth / (cols + 1);
    
    return {
      npc,
      x: edificio.area.start.x + (col + 1) * spacingX,
      y: edificio.area.start.z + (row + 1) * spacingY
    };
  });
};
```

**Resultado visual:**
```
┌─────────────────────┐
│     EDIFICIO       │
│                   │
│  👤  👤           │ ← NPCs distribuidos
│  👤  👤           │
│                   │
└─────────────────────┘
```

### Hit Detection

**Para edificios:**
```typescript
const onBuildingClick = (edificio: Edificio) => {
  const pointInBuilding = pointInRect(
    mouseCoords,
    edificio.area
  );
  
  if (pointInBuilding) {
    setSelectedIds(prev => 
      shiftKey 
        ? new Set([...prev, edificio.id])
        : new Set([edificio.id])
    );
  }
};
```

### Tooltip Content

**Para edificio:**
```
┌─────────────────────┐
│ 🏠 Rincon de los   │
│    Condenados       │
├─────────────────────┤
│ ID: EDIF_123       │
│ X: -28 → 1         │
│ Z: -74 → -26       │
├─────────────────────┤
│ 👤 NPCs: 2          │
│    - Alvar          │
│    - Lira          │
├─────────────────────┤
│ 📍 POIs: 2          │
│    - Barra          │
│    - Mesa          │
└─────────────────────┘
```

### Búsqueda

**Algoritmo de búsqueda:**
```typescript
const handleSearch = (query: string) => {
  const results = [
    ...edificios.filter(b => 
      b.name.toLowerCase().includes(query.toLowerCase())
    ),
    ...npcs.filter(n => 
      getCardName(npc.card).toLowerCase().includes(query.toLowerCase())
    )
  ];
  
  // Zoom al primer resultado
  if (results.length > 0) {
    zoomTo(results[0]);
    showTooltip(results[0]);
  }
  
  return results;
};
```

---

## 📦 Prerequisitos

### Dependencias Ya Instaladas ✅

- `konva: ^10.2.0`
- `react-konva: ^19.2.1`
- `lucide-react: ^0.525.0`
- Componentes shadcn/ui completos

### Archivos Base Ya Creados ✅

- ✅ `src/lib/map/types.ts`
- ✅ `src/lib/map/coordUtils.ts`
- ✅ `src/lib/map/useViewport.ts`
- ✅ `src/lib/map/useLayers.ts`
- ✅ `src/components/map/MapStage.tsx`
- ✅ `src/components/map/LayerControl.tsx`
- ✅ `src/lib/boundingBoxUtils.ts`
- ✅ `src/app/api/boundingBox/route.ts`

### Datos Disponibles ✅

- ✅ Edificios en `data-esparcraft/edificios/`
- ✅ NPCs en `data-esparcraft/npcs/`
- ✅ Pueblos en `data-esparcraft/pueblos/`
- ✅ Mundos en `data-esparcraft/worlds/`
- ✅ Tipos de lugares en `data-esparcraft/place-types/`

---

## 📝 Pasos Detallados de Implementación

### PASO 1: Crear estructura de carpetas para layers

```bash
# Crear carpeta para layers del mapa
mkdir -p src/components/map/layers

# Verificar estructura
ls -la src/components/map/
# Debe mostrar:
# - MapStage.tsx
# - LayerControl.tsx
# - index.ts
# - layers/ (nueva carpeta)
```

---

### PASO 2: Crear LayerFondo.tsx

**Archivo:** `src/components/map/layers/LayerFondo.tsx`

```typescript
'use client';

import { Rect, Group } from 'react-konva';

interface LayerFondoProps {
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  gridSize?: number;
  showGrid?: boolean;
}

export function LayerFondo({
  visible,
  opacity,
  width,
  height,
  gridSize = 100,
  showGrid = false
}: LayerFondoProps) {
  if (!visible) return null;

  return (
    <Group opacity={opacity}>
      {/* Fondo sólido */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#f8fafc"
      />

      {/* Grid opcional */}
      {showGrid && (
        <>
          {Array.from({ length: Math.ceil(width / gridSize) }).map((_, i) => (
            <Rect
              key={`v-${i}`}
              x={i * gridSize}
              y={0}
              width={1}
              height={height}
              fill="#e2e8f0"
              opacity={0.3}
            />
          ))}
          {Array.from({ length: Math.ceil(height / gridSize) }).map((_, i) => (
            <Rect
              key={`h-${i}`}
              x={0}
              y={i * gridSize}
              width={width}
              height={1}
              fill="#e2e8f0"
              opacity={0.3}
            />
          ))}
        </>
      )}
    </Group>
  );
}
```

---

### PASO 3: Crear POIMarker.tsx

**Archivo:** `src/components/map/POIMarker.tsx`

```typescript
'use client';

import { Circle, Text } from 'react-konva';
import { PlaceType, PointOfInterest } from '@/lib/types';

interface POIMarkerProps {
  poi: PointOfInterest;
  placeType: PlaceType | null;
  x: number;
  y: number;
  size?: number;
  onClick?: () => void;
}

export function POIMarker({
  poi,
  placeType,
  x,
  y,
  size = 16,
  onClick
}: POIMarkerProps) {
  const color = placeType?.color || '#64748b';
  const Icon = (placeType?.icon as any) || null;

  return (
    <Group
      x={x}
      y={y}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        e.target.getStage().container().style.cursor = 'default';
      }}
    >
      {/* Círculo de fondo */}
      <Circle
        x={0}
        y={0}
        radius={size / 2}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={2}
      />

      {/* Icono (si está disponible) */}
      {Icon && (
        <Text
          x={0}
          y={0}
          text={placeType?.icon[0]}
          fontSize={size / 2}
          fill={color}
          offsetX={-size / 4}
          offsetY={-size / 4}
        />
      )}

      {/* Nombre del POI en hover */}
      <Text
        x={0}
        y={size + 5}
        text={poi.name}
        fontSize={10}
        fill="#374151"
        offsetX={-poi.name.length * 2}
        opacity={0.8}
      />
    </Group>
  );
}
```

---

### PASO 4: Crear NPCMarker.tsx

**Archivo:** `src/components/map/NPCMarker.tsx`

```typescript
'use client';

import { Circle, Text } from 'react-konva';
import { NPC } from '@/lib/types';

interface NPCMarkerProps {
  npc: NPC;
  x: number;
  y: number;
  size?: number;
  onClick?: () => void;
}

export function NPCMarker({
  npc,
  x,
  y,
  size = 12,
  onClick
}: NPCMarkerProps) {
  const getName = (npc: NPC): string => {
    return npc.card?.data?.name || npc.card?.name || 'NPC';
  };

  return (
    <Group
      x={x}
      y={y}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        e.target.getStage().container().style.cursor = 'default';
      }}
    >
      {/* Círculo del NPC */}
      <Circle
        x={0}
        y={0}
        radius={size / 2}
        fill="#f59e0b"
        stroke="#d97706"
        strokeWidth={2}
      />

      {/* Nombre del NPC en hover */}
      <Text
        x={0}
        y={size + 4}
        text={getName(npc)}
        fontSize={9}
        fill="#374151"
        offsetX={-getName(npc).length * 3}
        opacity={0.9}
      />
    </Group>
  );
}
```

---

### PASO 5: Crear LayerZonas.tsx

**Archivo:** `src/components/map/layers/LayerZonas.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Rect, Text, Group } from 'react-konva';
import { Pueblo } from '@/lib/types';
import { coordConverter } from '@/lib/map/coordUtils';
import { ELEMENT_COLORS } from '@/lib/map/types';

interface LayerZonasProps {
  visible: boolean;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect?: (pueblo: Pueblo) => void;
  onHover?: (pueblo: Pueblo | null) => void;
}

export function LayerZonas({
  visible,
  opacity,
  scale,
  offsetX,
  offsetY,
  onSelect,
  onHover
}: LayerZonasProps) {
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);

  useEffect(() => {
    const fetchPueblos = async () => {
      const response = await fetch('/api/pueblos');
      const result = await response.json();
      if (result.success) {
        setPueblos(result.data);
      }
    };

    fetchPueblos();
  }, []);

  if (!visible) return null;

  return (
    <Group opacity={opacity}>
      {pueblos
        .filter(pueblo => pueblo.area)
        .map(pueblo => {
          const start = coordConverter.minecraftToPixel(
            { worldX: pueblo.area!.start.x, worldZ: pueblo.area!.start.z },
            { scale, offsetX, offsetY }
          );
          
          const end = coordConverter.minecraftToPixel(
            { worldX: pueblo.area!.end.x, worldZ: pueblo.area!.end.z },
            { scale, offsetX, offsetY }
          );
          
          const width = end.x - start.x;
          const depth = end.y - start.y;
          
          const color = pueblo.type === 'nacion'
            ? ELEMENT_COLORS.nacion.default
            : ELEMENT_COLORS.pueblo.default;

          return (
            <Group
              key={pueblo.id}
              onMouseEnter={() => onHover?.(pueblo)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(pueblo)}
            >
              {/* Rectángulo de la zona */}
              <Rect
                x={start.x}
                y={start.y}
                width={width}
                height={depth}
                fill={`${color}30`}
                stroke={color}
                strokeWidth={2}
                dash={[5, 5]}
              />

              {/* Nombre de la zona */}
              <Text
                x={start.x + width / 2}
                y={start.y + depth / 2}
                text={pueblo.name}
                fontSize={12}
                fill="#374151"
                align="center"
                verticalAlign="middle"
              />
            </Group>
          );
        })}
    </Group>
  );
}
```

---

### PASO 6: Crear LayerEdificios.tsx (COMPLETO)

**Archivo:** `src/components/map/layers/LayerEdificios.tsx`

**Este es el componente MÁS IMPORTANTE** - integra edificios, NPCs y POIs.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Rect, Text, Group } from 'react-konva';
import { Edificio, NPC, PlaceType, PointOfInterest } from '@/lib/types';
import { coordConverter } from '@/lib/map/coordUtils';
import { ELEMENT_COLORS, MAP_CONSTANTS } from '@/lib/map/types';
import NPCMarker from '../NPCMarker';
import POIMarker from '../POIMarker';

interface LayerEdificiosProps {
  visible: boolean;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelect?: (edificio: Edificio) => void;
  onHover?: (edificio: Edificio | null) => void;
}

export function LayerEdificios({
  visible,
  opacity,
  scale,
  offsetX,
  offsetY,
  onSelect,
  onHover
}: LayerEdificiosProps) {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [placeTypes, setPlaceTypes] = useState<Record<string, PlaceType>>({});

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      const [edifRes, npcRes, placeTypesRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/npcs'),
        fetch('/api/place-types')
      ]);

      const edifData = await edifRes.json().then(r => r.data);
      const npcData = await npcRes.json().then(r => r.data);
      const ptData = await placeTypesRes.json().then(r => r.data);

      setEdificios(edifData);
      setNpcs(npcData);
      
      const placeTypesMap: Record<string, PlaceType> = {};
      ptData.forEach((pt: PlaceType) => {
        placeTypesMap[pt.id] = pt;
      });
      setPlaceTypes(placeTypesMap);
    };

    fetchData();
  }, []);

  // Filtrar NPCs por edificio
  const getNPCsDelEdificio = (edificioId: string): NPC[] => {
    return npcs.filter(npc => 
      npc.location.edificioId === edificioId
    );
  };

  // Distribuir NPCs dentro del edificio
  const posicionarNPCsEnEdificio = (
    edificio: Edificio,
    npcsEnEdificio: NPC[]
  ): Array<{ npc: NPC; x: number; y: number }> => {
    if (npcsEnEdificio.length === 0) return [];

    const buildingWidth = Math.abs(edificio.area.end.x - edificio.area.start.x);
    const buildingDepth = Math.abs(edificio.area.end.z - edificio.area.start.z);
    
    return npcsEnEdificio.map((npc, index) => {
      const cols = Math.ceil(Math.sqrt(npcsEnEdificio.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const spacingX = buildingWidth / (cols + 1);
      const spacingY = buildingDepth / (cols + 1);
      
      return {
        npc,
        x: edificio.area.start.x + (col + 1) * spacingX,
        y: edificio.area.start.z + (row + 1) * spacingY
      };
    });
  };

  if (!visible) return null;

  return (
    <Group opacity={opacity}>
      {edificios.map(edificio => {
        const npcsEnEdificio = getNPCsDelEdificio(edificio.id);
        const npcsPosicionados = posicionarNPCsEnEdificio(edificio, npcsEnEdificio);
        const pois = edificio.puntosDeInteres || [];
        
        // Convertir coordenadas Minecraft a Pixels
        const start = coordConverter.minecraftToPixel(
          { worldX: edificio.area.start.x, worldZ: edificio.area.start.z },
          { scale, offsetX, offsetY }
        );
        
        const width = Math.abs(edificio.area.end.x - edificio.area.start.x) * scale;
        const depth = Math.abs(edificio.area.end.z - edificio.area.start.z) * scale;
        
        return (
          <Group
            key={edificio.id}
            onMouseEnter={() => onHover?.(edificio)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onSelect?.(edificio)}
          >
            {/* Rectángulo del edificio */}
            <Rect
              x={start.x}
              y={start.y}
              width={width}
              height={depth}
              fill={ELEMENT_COLORS.building.default}
              stroke={ELEMENT_COLORS.building.default}
              strokeWidth={2}
            />

            {/* NPCs dentro del edificio */}
            {npcsPosicionados.map(({ npc, x, y }) => {
              const npcPixels = coordConverter.minecraftToPixel(
                { worldX: x, worldZ: y },
                { scale, offsetX, offsetY }
              );
              
              return (
                <NPCMarker
                  key={npc.id}
                  npc={npc}
                  x={npcPixels.x}
                  y={npcPixels.y}
                  size={12}
                />
              );
            })}
            
            {/* Puntos de interés */}
            {pois.map(poi => {
              const poiPixels = coordConverter.minecraftToPixel(
                { 
                  worldX: poi.coordenadas.x, 
                  worldZ: poi.coordenadas.z 
                },
                { scale, offsetX, offsetY }
              );
              
              return (
                <POIMarker
                  key={poi.id}
                  poi={poi}
                  placeType={placeTypes[poi.tipo] || null}
                  x={poiPixels.x}
                  y={poiPixels.y}
                  size={16}
                />
              );
            })}
            
            {/* Label del nombre del edificio */}
            <Text
              x={start.x + width / 2}
              y={start.y + depth + 15}
              text={edificio.name}
              fontSize={13}
              fill="#374151"
              align="center"
            />
          </Group>
        );
      })}
    </Group>
  );
}
```

---

### PASO 7: Actualizar MapTab.tsx para integrar todo

**Archivo:** `src/components/dashboard/MapTab.tsx`

```typescript
'use client';

import { useState } from 'react';
import MapStage from '@/components/map/MapStage';
import LayerFondo from '@/components/map/layers/LayerFondo';
import LayerZonas from '@/components/map/layers/LayerZonas';
import LayerEdificios from '@/components/map/layers/LayerEdificios';
import LayerControl from '@/components/map/LayerControl';
import { Edificio, Pueblo, NPC } from '@/lib/types';

export default function MapTab() {
  const [selectedBuilding, setSelectedBuilding] = useState<Edificio | null>(null);
  const [selectedPueblo, setSelectedPueblo] = useState<Pueblo | null>(null);
  const [hoveredElement, setHoveredElement] = useState<any>(null);

  const handleSelectBuilding = (edificio: Edificio) => {
    setSelectedBuilding(edificio);
    setSelectedPueblo(null);
  };

  const handleSelectPueblo = (pueblo: Pueblo) => {
    setSelectedPueblo(pueblo);
    setSelectedBuilding(null);
  };

  return (
    <div className="w-full h-full relative bg-background">
      <div className="absolute inset-0">
        <MapStage
          width={1000}
          height={800}
          options={{
            minScale: 0.1,
            maxScale: 5,
            defaultScale: 1
          }}
        >
          <LayerFondo
            visible={true}
            opacity={1}
            width={1000}
            height={800}
            showGrid={false}
          />

          <LayerZonas
            visible={true}
            opacity={0.7}
            scale={1}
            offsetX={0}
            offsetY={0}
            onSelect={handleSelectPueblo}
            onHover={setHoveredElement}
          />

          <LayerEdificios
            visible={true}
            opacity={1}
            scale={1}
            offsetX={0}
            offsetY={0}
            onSelect={handleSelectBuilding}
            onHover={setHoveredElement}
          />
        </MapStage>
      </div>

      {/* Panel de control de capas */}
      <div className="absolute top-4 left-4 z-10">
        <LayerControl />
      </div>

      {/* Panel de selección (opcional - puede ser sidebar) */}
      {(selectedBuilding || selectedPueblo) && (
        <div className="absolute top-4 right-4 w-80 bg-background border rounded-lg shadow-lg p-4 z-10">
          <h3 className="text-lg font-bold mb-3">
            {selectedBuilding ? 'Edificio Seleccionado' : 'Región Seleccionada'}
          </h3>
          
          {selectedBuilding && (
            <>
              <div className="space-y-2">
                <p><strong>Nombre:</strong> {selectedBuilding.name}</p>
                <p><strong>ID:</strong> {selectedBuilding.id}</p>
                <p><strong>Coordenadas:</strong></p>
                <p className="text-sm ml-4">
                  X: {selectedBuilding.area.start.x} → {selectedBuilding.area.end.x}
                </p>
                <p className="text-sm ml-4">
                  Z: {selectedBuilding.area.start.z} → {selectedBuilding.area.end.z}
                </p>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {/* Ir a editor */}}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                >
                  Abrir en Editor
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedBuilding.id)}
                  className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"
                >
                  Copiar ID
                </button>
              </div>
            </>
          )}

          {selectedPueblo && (
            <>
              <div className="space-y-2">
                <p><strong>Nombre:</strong> {selectedPueblo.name}</p>
                <p><strong>Tipo:</strong> {selectedPueblo.type}</p>
                <p><strong>ID:</strong> {selectedPueblo.id}</p>
                <p><strong>Descripción:</strong> {selectedPueblo.description}</p>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {/* Ir a editor */}}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                >
                  Abrir en Editor
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedPueblo.id)}
                  className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"
                >
                  Copiar ID
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Lista de Verificación

### Antes de comenzar:

- [ ] Revisar que todas las dependencias estén instaladas (`bun install`)
- [ ] Verificar que los tipos de lugares estén en `data-esparcraft/place-types/`
- [ ] Actualizar las áreas de pueblos y mundos (botón "Actualizar Áreas" en Universo)
- [ ] Verificar que los edificios tienen coordenadas válidas en `data-esparcraft/edificios/`

### Después de cada fase:

**FASE 1:**
- [ ] LayerFondo renderiza correctamente
- [ ] LayerEdificios muestra edificios
- [ ] NPCs dentro de edificios se ven
- [ ] POIs con iconos de tipos se ven
- [ ] Hover highlight funciona
- [ ] Click selecciona edificios

**FASE 2:**
- [ ] LayerZonas muestra bounding boxes de pueblos
- [ ] Tooltips muestran información correcta
- [ ] Panel lateral muestra detalles del elemento seleccionado
- [ ] Botones de acción funcionan (Copiar ID, Abrir en Editor)

**FASE 3:**
- [ ] Mapa completo funciona en pestaña Mapa 2D
- [ ] Pan/zoom funcionan correctamente
- [ ] LayerControl permite controlar todas las capas
- [ ] Selección múltiple con shift+click funciona

---

## 🎯 Resumen Final

### Tiempo Estimado

- **MVP (Fases 1-3):** 12-16 horas
  - LayerFondo: 1-2 horas
  - LayerEdificios: 2-3 horas ⭐
  - NPCMarker: 1 hora
  - POIMarker: 1 hora
  - LayerZonas: 2-3 horas
  - LayerTooltips: 1-2 horas
  - Panel Lateral: 1-2 horas
  - Integración: 1-2 horas

- **Completo (Fases 1-4):** 16-20 horas
  - Más búsqueda: +1 hora
  - Más NPCs outdoors: +1-2 horas

- **Premium (Fases 5-6):** +14-18 horas
  - Modo edición: +6-8 horas
  - Heatmap: +3-4 horas
  - Timeline: +3-4 horas

### Archivos a Crear

1. `src/components/map/layers/LayerFondo.tsx`
2. `src/components/map/layers/LayerZonas.tsx`
3. `src/components/map/layers/LayerEdificios.tsx` ⭐ MÁS IMPORTANTE
4. `src/components/map/layers/LayerTooltips.tsx`
5. `src/components/map/NPCMarker.tsx`
6. `src/components/map/POIMarker.tsx`
7. `src/components/map/layers/LayerNPCsOutdoors.tsx` (opcional)

### Archivos a Modificar

1. `src/components/dashboard/MapTab.tsx` ⭐ PRINCIPAL

---

## 🚀 Comenzar la Implementación

**Recomendación:** Comenzar por FASE 1, Tarea 2 (Layer de Edificios) que es la MÁS IMPORTANTE.

**Por qué:** Esta tarea te permitirá:
- Ver resultados visibles inmediatamente
- Probar la arquitectura completa del mapa
- Validar que todo funciona antes de continuar

---

## 📞 Notas Adicionales

### Errores Comunes y Soluciones

1. **Error:** "Stage is undefined"
   - **Solución:** Asegurarse de importar Stage desde 'react-konva'

2. **Error:** Las coordenadas no se alinean
   - **Solución:** Verificar que se usa `worldZ` para Y y `worldX` para X (¡no al revés!)

3. **Error:** Los NPCs no aparecen
   - **Solución:** Verificar que el campo `location.edificioId` existe y coincide con algún edificio

4. **Error:** Los tooltips no desaparecen
   - **Solución:** Asegurarse de tener un estado de `hoveredElement` que se actualiza correctamente

### Buenas Prácticas

1. **Usar debouncing** en zoom para no recalcular demasiadas veces
2. **Optimizar renders** usando `useMemo` y `useCallback`
3. **Manejar memoria** limitando la cantidad de elementos renderizados
4. **Validar datos** antes de renderizar (no mostrar edificios sin coordenadas)
5. **Testing**: Probar con diferentes tamaños de ventana y niveles de zoom

---

## 📚 Referencias

**Documentación de Konva:**
- https://konvajs.org/docs/react/intro
- https://konvajs.org/docs/react/Rect
- https://konvajs.org/docs/react/Stage

**Documentación de react-konva:**
- https://react-konva.com/

**Tipos del proyecto:**
- `src/lib/map/types.ts` - Todos los tipos definidos
- `src/lib/map/coordUtils.ts` - Utilidades de coordenadas
- `src/lib/boundingBoxUtils.ts` - Cálculo de áreas

---

## ✨ Conclusión

Este plan proporciona una **hoja de ruta completa** para implementar un mapa interactivo 2D funcional con:

- ✅ Pan/zoom fluido
- ✅ Visualización de mundos, regiones, edificios y NPCs
- ✅ Hit detection y selección
- ✅ Tooltips informativos
- ✅ Panel lateral con detalles
- ✅ Sistema de capas completo
- ✅ Posibilidad futura de modo edición

**Próximo paso:** Implementar FASE 1, Tarea 2 (Layer de Edificios) 🚀

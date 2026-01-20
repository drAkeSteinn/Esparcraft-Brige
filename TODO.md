# 📋 TODO - Estado del Proyecto Bridge IA

**Fecha de última actualización**: 2025-01-13

---

## ✅ FASE 1: Preparación y Limpieza (100% completada)

### ✅ 1. Eliminar Mapa 2D Actual
- **Archivo**: `src/components/dashboard/MapTab.tsx`
- **Estado**: ✅ Completado
- **Backup**: `src/components/dashboard/MapTab.tsx.backup`

### ✅ 2-a. Instalar Dependencias Konva
- **Archivo**: `package.json`, `bun.lock`
- **Dependencias**:
  - `konva`: ^10.2.0
  - `react-konva`: ^19.2.1
- **Estado**: ✅ Completado

### ✅ 2-b. Crear Tipos TypeScript
- **Archivos**:
  - `src/lib/map/types.ts` (500+ líneas)
  - `src/lib/map/coordUtils.ts` (200+ líneas)
  - `src/lib/map/index.ts` (exportaciones)
- **Estado**: ✅ Completado
- **Características**:
  - Tipos de coordenadas (MinecraftCoords, PixelCoords)
  - Tipos de Viewport (ViewportState, ViewportLimits)
 7 tipos de capas (background, zones, buildings, npcs, routes, activity, ui)
- Tipos de Selección (SelectableType, SelectionState)
- 5 modos de edición (view, select, create, edit, delete)
- Tipos de eventos (MapZoomEvent, MapPanEvent, MapClickEvent, MapHoverEvent, MapSelectionEvent)
- Elementos renderizados (MapBuilding, MapNPC, MapZone, MapRoute)
- Constantes (MAP_CONSTANTS, ELEMENT_COLORS, DEFAULT_LAYERS)
- Utilidades de conversión (CoordConverter con transformaciones bidireccionales)
- Detección de colisiones (pointInRect, rectsIntersect)
- Cálculo de distancias, bounding boxes, centro y área de rectángulos

---

## 🚀 FASE 2: Infraestructura Base (50% completada)

### ✅ 3-a. Implementar Stage y Viewport
- **Archivos**:
  - `src/lib/map/useViewport.ts` (350+ líneas)
  - `src/components/map/MapStage.tsx` (200+ líneas)
- **Estado**: ✅ Completado

**Características implementadas**:
- Zoom con rueda del mouse (debounced a 50ms)
- Pan con arrastre del mouse (botón izquierdo o medio)
- Zoom centrado en puntero del mouse (fórmula matemática correcta)
- Límites de zoom configurables (10% - 500%)
- Reset de viewport con doble click
- Overlay informativo de zoom (% actual)
- Overlay de instrucciones para usuario
- Cursor dinámico (grab cuando scale > 1)
- Global mouseup listener para prevenir drag "pegado"
- Resize listener responsivo

**Fórmula de zoom centrado**:
```typescript
scaleRatio = clampedScale / prev.scale;
newOffsetX = point.x - (point.x - prev.offsetX) * scaleRatio;
newOffsetY = point.y - (point.y - prev.offsetY) * scaleRatio;
```

---

### ✅ 3-b. Crear Sistema de Capas
- **Archivos**:
  - `src/lib/map/useLayers.ts` (~250 líneas)
  - `src/components/map/LayerControl.tsx` (~200 líneas)
  - `src/components/map/index.ts` (exportaciones actualizado)
- **Estado**: ✅ Completado

**Características implementadas**:
- 7 capas gestionadas: background, zones, buildings, npcs, routes, activity, ui
- Toggle de visibilidad para cada capa
- Toggle de bloqueo para cada capa (excepto UI)
- Slider de opacidad para cada capa (0-100%)
- Capa activa tracking
- 3 presets rápidos:
  - Todo: Todas las capas visibles
  - Edificios: Solo edificios visible
  - Mapa: Solo pueblos, zonas y rutas visibles
  - Configuración por defecto para cada capa (nombre, color, zIndex, locked, visible, opacity)

- **Control completo**:
  - Toggles de visibilidad (botón con icono Eye/EyeOff)
  - Toggle de bloqueo (botón con icono Lock/Unlock)
  - Slider de opacidad con porcentaje
- Presets rápidos (Todo, Edificios, Mapa)
- Estado visual de capa (Visible/Oculto, Bloqueado/Desbloqueado)
- Capa activa resaltada visualmente

- **Información**:
- Prioridad de renderizado: UI (zIndex: 1000) → NPCs (zIndex: 30) → Edificios (zIndex: 20) → Rutas (zIndex: 15) → Zonas (zIndex: 10) → Fondo (zIndex: 0)
- Ayuda para entender el sistema de capas

---

## ⏳ Tareas Pendientes (FASE 2 en progreso)

### 🔄 FASE 2: Infraestructura Base (50% - 1 tarea pendiente)

#### 3-b: Crear Sistema de Capas ⏳ **EN PROCESO**
- **Prioridad**: Alta
- **Descripción**: Implementar sistema de capas con toggles y configuración

---

### 🏳 FASE 3: Capas de Rendering (0% - 4 tareas pendientes)

#### 4-a: Layer de Fondo ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Cargar imagen de fondo, soporte para tiles opcional
- **Subtareas**:
  - Cargar imagen desde URL o archivo local
- Crear patrón de tiles (opcional)
- Mostrar capa bajo las demás capas (zIndex: 0)
  - Configurar como no-editable (locked)

#### 4-b: Layer de Pueblos/Zonas ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Renderizar polígonos para pueblos y zonas
- **Subtareas**:
  - Cargar datos de pueblos desde `/api/pueblos`
- Transformar coordenadas Minecraft a píxeles
- Renderizar polígonos con colores según tipo (pueblo/nación)
- Implementar hover highlight
- Mostrar labels con nombres
- Integrar con selección del mapa

#### 4-c: Layer de Edificios ⭐ **PRIORIDAD ALTA**
- **Prioridad**: Alta
- **Descripción**: Renderizar edificios como rectángulos con coordenadas Minecraft
- **Subtareas**:
- Cargar datos de edificios desde `/api/edificios`
- Transformar coordenadas Minecraft a píxeles
- Renderizar rectángulos con colores por tipo de edificio
- Implementar hover highlight
- Mostrar labels con nombres de edificios
- Integrar con selección del mapa
- Mostrar indicadores de edificios con eventos recientes
- Soportar cientos de edificios

#### 5-a: Layer de NPCs ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Renderizar NPCs como íconos con labels
- **Subtareas**:
- Cargar datos de NPCs desde `/api/npcs`
- Transformar coordenadas Minecraft a píxeles
- Renderizar íconos con colores
- Mostrar labels con nombres
- Integrar con selección del mapa
- Mostrar indicadores de NPCs con estado

#### 5-b: Layer de UI ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Capa para tooltips, selección, bounding boxes
- **Subtareas**:
- Componente Tooltip que sigue al cursor
- Bounding box alrededor de elementos seleccionados
- Highlight visual de elementos seleccionados
- Mostrar nombres y tipos en tooltips
- Integrar con LayerControl para mostrar estado

---

## ⏳ FASE 4: Interacción Básica (0% - 4 tareas pendientes)

#### 6-a: Zoom con Rueda del Mouse ⏳ **PENDIENTE**
- **Prioridad**: Alta
- **Descripción**: Implementado en Tarea 3-a
- **Subtareas**:
- Controlador de zoom en useViewport hook
- Overlay informativo de zoom

#### 6-b: Pan con Arrastre ⏳ **PENDIENTE**
- **Prioridad**: Alta
- **Descripción**: Implementado en Tarea 3-a
- **Subtareas**:
- Controlador de pan en useViewport hook
- Cursor dinámico según estado

#### 7: Utilidades de Coordenadas ⏳ **PENDIENTE**
- **Prioridad**: Alta
- **Descripción**: Implementado en coordUtils.ts
- **Subtareas**:
- Conversor de coordenadas (CoordConverter)
- Transformaciones bidireccionales (Minecraft ↔ Pixels)
- Snap a grilla
- Cálculo de distancias
- Normalización de rectángulos
- Detección de colisiones

#### 8-a: Hit Detection ⏳ **PENDIENTE**
- **Prioridad**: Alta
- **Descripción**: Detectar clicks en edificios/NPCs
- **Subtareas**:
- Implementar hit testing en Konva
- Manejar eventos de click en elementos
- Activar/desactivar selección
- Shift+click para selección múltiple
- Notificar al componente padre sobre selección

#### 8-b: Selección Simple/Múltiple ⏳ **PENDIENTE**
- **Prioridad**: Media
-**Descripción**: Implementar selección simple (click) y múltiple (shift+click)
- **Subtareas**:
- Implementar toggle entre selección simple y múltiple
- Manejar estado de selección (selectedIds, hoveredId)
- Integrar con LayerControl para mostrar estado

#### 8-c: Drag Box Selection ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Selección de múltiples elementos arrastrando caja
- **Subtareas**:
- Implementar rectángulo de selección arrastrando
- Calcular elementos dentro de caja
- Integrar con modo de edición

---

## ⏸️ FASE 5: UI Avanzada (0% - 7 tareas pendientes)

#### 9-a: Tooltips ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Mostrar tooltips al hacer hover
- **Subt**:
- Posicionar cerca del cursor
- Mostrar nombre, tipo, ID
- Desaparecer cuando sale del elemento

#### 9-b: Highlight Visual ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Highlight visual al seleccionar elementos
- **Subtareas**:
- Resaltar elementos seleccionados con colores de selección
- Mostrar en LayerUI
- Integrar con LayerControl

#### 10-a: Toggles de Capas ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Toggles para capas
- **Subtareas**:
- Implementar LayerControl en el mapa
- Permitir controlar visibilidad de cada capa

#### 10-b: Search Box ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Buscar y filtrar elementos
- **Subtareas**:
- Crear componente SearchBox
- Filtrar por nombre, tipo, ubicación
- Mostrar resultados destacados
- Permitir seleccionar desde búsqueda

#### 10-c: Highlight por Estado ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descipción**: Resaltar elementos con eventos recientes
- **Subtareas**:
- Integrar con `/api/sessions`
- Identificar edificios con actividad reciente
- Mostrar indicadores visuales en el mapa

#### 11-a: Panel Lateral ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Panel con detalles del elemento seleccionado
- **Subtareas**:
- Crear componente SidePanel
- Mostrar JSON del elemento seleccionado
- Botones de acción:
  - "Abrir en editor" → Navegar a pestaña Mundo/Edificios
  - "Copiar ID" → Copiar ID al portapapeles
  - "Ir a Sessions" → Filtrar por ese NPC en pestaña Sessions

#### 11-b: Botones de Acción ⏳ **PENDIENTE**
- **Prioridad**: Media
- **Descripción**: Botones para acciones rápidas
- **Subtareas**:
- Implementar botones de acción en SidePanel
- Funcionalidad para cada botón

---

## 🏳 FASE 6: Features Premium (0% - 8 tareas pendientes)

#### 12-a: Edición - Crear Rectángulo ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Crear herramienta para dibujar rectángulos
- **Subtareas**:
- Activar modo edición "create" en EditState
- Implementar herramienta de dibujo de rectángulo
- Definir tamaño arrastrando
- Snap a grilla opcional
- Guardar al crear

#### 12-b: Edición - Crear Polígono ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Crear herramienta para dibujar polígonos
- **Subtareas**:
- Activar modo edición "create" para zonas
- Implementar herramienta de dibujo de polígonos
- Definir vértices arrastrando
- Snap a grilla opcional
- Guardar al crear

#### 12-c: Edición - Drag Handles ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Redimensionar edificios con handles
- **Subtareas**:
- Activar modo edición "edit"
- Implementar handles en esquinas de rectángulos
- Permitir redimensionamiento
- Actualizar coordenadas al mover handles
- Guardar cambios al soltar

#### 12-d: Edición - Snap a Grilla ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Snap opcional a grilla durante edición
- **Subtareas**:
- Implementar función de snap en coordUtils
- Integrar con herramientas de edición
- Permitir cambiar tamaño de grilla
- Snap a bloques de Minecraft (defecto: 1)

#### 13-a: Lock Layers ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Bloquear capas para evitar cambios accidentales
- **Subtareas**:
- Implementar toggle de bloqueo en LayerControl
- Mostrar indicador visual de capa bloqueada
- Prevenir modificación de capas bloqueadas

#### 13-b: Persistencia de Cambios ⭐ **ALTA PRIORIDAD**
- **Prioridad**: Alta
- **Descripción**: Guardar cambios al editar en el mapa
- **Subtareas**:
- Integrar con API existente (`/api/edificios`)
- Guardar cambios en tiempo real al modificar
- Implementar auto-save periódico
- Mostrar indicador de "sin guardar" cuando hay cambios sin guardar
- Permitir guardar manualmente

#### 14-a: Heatmap de Actividad ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Visualizar actividad por edificio
- **Subtareas**:
- Integrar con `/api/sessions` para obtener actividad
- Calcular "hotspots" por edificio
- Renderizar heatmap en LayerActivity (overlay en buildings)
- Colores del rojo (alta) a verde (baja)
- Mostrar leyenda de intensidad

#### 14-b: Timeline Scrub ⏳ **PENDIENTE**
- **Propósito**: **Baja Prioridad**
- **Descripción**: Ver mapa en diferentes momentos del tiempo
- **Subtareas**:
- Crear componente Timeline
- Integrar con sistema de versionado (si existe)
- Permitir navegar por tiempo
- Mostrar estados del mapa en diferentes timestamps

---

## 🧪 Testing Completo ⏳ **PENDIENTE**

#### 15: Testing Completo ⭐ **ALTA PRIORIDAD**
- **Prioridad**: Alta
- **Descripción**: Testing completo del sistema
- **Subtareas**:
- Verificar pan/zoom fluido en todas las direcciones
- Verificar selección simple y múltiple (click + shift+click)
- Verificar tooltips posicionamiento y contenido
- Verificar persistencia de cambios
- Verificar rendimiento con cientos de edificios/NPCs
- Verificar funcionamiento de todas las capas
- Probar todas las funciones de edición
- Pruebas de integración con APIs

---

## 📊 Estadísticas del Proyecto

### Progreso por FASE
- **FASE 1**: ████████████████ 100%
- **FASE 2**: ████████░░░░░░░░░░░ 50%
- **FASE 3**: ░░░░░░░░░░░░░░░░░░░░░░░░ 0%
- **FASE 4**: ░░░░░░░░░░░░░░░░░░░░░░░░░░0%
- **FASE 5**: ░░░░░░░░░░░░░░░░░░░░░░░░░0%
- **FASE 6**: ░░░░░░░░░░░░░░░░░░░░░░░░░░0%

### Progreso General
- **Total completado**: 4 de 15 tareas (26.7%)
- **Tareas pendientes**: 11 tareas
- **Fases completadas**: 1 de 6 fases

### Archivos del Proyecto
- **Librería del mapa**: 5 archivos (~1200 líneas de código)
- **Componentes del mapa**: 4 archivos (~800 líneas de código)
- **Documentación**: 3 archivos (worklog, worklog, resume)

---

## 🎯 Próxima Tarea Sugerida

**Tarea 4-c: Layer de Edificios** ⭐ **ALTA PRIORIDAD**
**Prioridad**: Alta
**Descripción**: Renderizar edificios como rectángulos con coordenadas Minecraft
**Por qué es la próxima tarea más importante:**

Es la capa más fundamental del mapa, ya que los edificios son los elementos principales que se deben visualizar. Sin el Layer de Edificios, el mapa no mostraría nada útil.

**Implementar el Layer de Edificios te permitirá:**
1. Visualizar todos los edificios de tu servidor
2. Navegar entre pueblos y ver edificios
3. Comenzar a usar el mapa de forma práctica
4. Probar todas las demás funcionalidades (selección, tooltips, etc.)

---

## 📚 Cómo Continuar el Proyecto

1. **Revisar este archivo** (`TODO.md`) para ver el estado actual
2. **Revisar** `PROJECT_RESUME.md` para ver el resumen completo
3. **Revisar** `PROJECT_WORKLOG.md` para ver el historial detallado
4. **Continuar con la Tarea 4-c**: Implementar Layer de Edificios

---

**¿Desea continuar con la Tarea 4-c (Layer de Edificios) o prefieres abordar otra tarea?** 🎯

# Implementación de Cálculo Automático de Coordenadas para Regiones y Mundos

## 📋 Resumen de la Implementación

Se ha implementado un sistema completo para calcular automáticamente las coordenadas (bounding boxes) de:

1. **Regiones (Pueblos/Naciones)**: Se calculan a partir de las edificaciones que contienen
2. **Mundos**: Se calculan a partir de los bounding boxes de las regiones (pueblos) que contienen

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`/src/lib/boundingBoxUtils.ts`** (Archivo principal)
   - Funciones para calcular bounding boxes
   - Funciones para actualizar áreas de pueblos y mundos
   - Utilidades para calcular estadísticas de áreas

2. **`/src/app/api/boundingBox/route.ts`** (API Endpoint)
   - GET: Actualiza todas las áreas (pueblos y mundos)
   - POST: Actualiza áreas específicas (pueblo, mundo, o todas)

### Archivos Modificados

1. **`/src/lib/types.ts`**
   - Agregado campo `area?: Area` a la interfaz `World`
   - Agregado campo `area?: Area` a la interfaz `Pueblo`

2. **`/src/lib/fileManager.ts`**
   - Actualizado `DATA_DIR` para usar `data-esparcraft` en lugar de `data`

3. **`/src/components/dashboard/mundo/MundosSection.tsx`**
   - Agregado botón "Actualizar Áreas"
   - Agregada visualización de coordenadas calculadas del mundo
   - Mostradas dimensiones y área del mundo

4. **`/src/components/dashboard/mundo/PueblosSection.tsx`**
   - Agregado botón "Actualizar Áreas"
   - Agregada visualización de coordenadas calculadas de la región
   - Mostradas dimensiones y área de la región
   - Contador de edificaciones en la región

## 🔧 Funcionalidades Implementadas

### 1. Funciones de Cálculo de Bounding Boxes

#### `calculateBoundingBox(areas: Area[]): Area | null`
Calcula el bounding box mínimo que contiene todas las áreas dadas.

#### `calculateBoundingBoxArea(area: Area): number`
Calcula el área (ancho × profundidad) de un bounding box.

#### `getBoundingBoxCenter(area: Area): Coords3D`
Obtiene las coordenadas del centro de un bounding box.

#### `calculatePuebloBoundingBox(puebloId: string): Area | null`
Calcula el bounding box de un pueblo basado en sus edificaciones.

#### `calculateWorldBoundingBox(worldId: string): Area | null`
Calcula el bounding box de un mundo basado en los bounding boxes de sus pueblos.

### 2. Funciones de Actualización

#### `updatePuebloArea(puebloId: string): Pueblo | null`
Actualiza el área de un pueblo calculándola desde sus edificaciones.
- Si no tiene edificaciones, elimina el campo `area` si existe
- Guarda los cambios en el archivo JSON

#### `updateWorldArea(worldId: string): World | null`
Actualiza el área de un mundo calculándola desde sus pueblos.
- Si no tiene pueblos con edificaciones, elimina el campo `area` si existe
- Guarda los cambios en el archivo JSON

#### `updateAllAreas(): {...}`
Actualiza todas las áreas de pueblos y mundos.
Devuelve estadísticas de la actualización:
- `pueblosUpdated`: Cantidad de pueblos actualizados
- `pueblosTotal`: Total de pueblos
- `mundosUpdated`: Cantidad de mundos actualizados
- `mundosTotal`: Total de mundos

### 3. Funciones de Utilidades

#### `getAreaStats(area: Area)`
Obtiene estadísticas completas de un área:
- Coordenadas del centro
- Dimensiones (ancho, alto, profundidad)
- Área total
- Coordenadas mínimas y máximas

## 🌐 API Endpoints

### `GET /api/boundingBox`
Actualiza todas las áreas (pueblos y mundos) y devuelve estadísticas.

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "message": "Áreas actualizadas correctamente",
  "data": {
    "pueblosUpdated": 2,
    "pueblosTotal": 2,
    "mundosUpdated": 1,
    "mundosTotal": 1,
    "timestamp": "2025-01-22T12:00:00.000Z"
  }
}
```

### `POST /api/boundingBox`
Actualiza áreas específicas.

**Body:**
```json
{
  "type": "pueblo" | "world" | "all",
  "id": "ID del pueblo o mundo (solo para type 'pueblo' o 'world')"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Área del pueblo Hexen actualizada",
  "data": { /* datos del pueblo actualizado */ }
}
```

## 🎨 Funcionalidades en la UI

### Pestaña de Regiones (PueblosSection)
- **Botón "Actualizar Áreas"**: Calcula y actualiza todas las áreas de regiones y mundos
- **Visualización de áreas**: Muestra las coordenadas calculadas de cada región
- **Contador de edificaciones**: Muestra cuántas edificaciones tiene cada región
- **Estado del área**: Indica si tiene área calculada o no (y por qué)

### Pestaña de Mundos (MundosSection)
- **Botón "Actualizar Áreas"**: Calcula y actualiza todas las áreas de mundos
- **Visualización de áreas**: Muestra las coordenadas calculadas de cada mundo
- **Contador de regiones**: Muestra cuántas regiones tiene cada mundo
- **Estado del área**: Indica si tiene área calculada o no (y por qué)

## 🔄 Flujo de Trabajo

1. **Usuario crea/actualiza/elimina edificaciones**: Las coordenadas de las edificaciones se definen manualmente
2. **Usuario actualiza áreas**: Clic en el botón "Actualizar Áreas" en la pestaña correspondiente
3. **Cálculo automático**: El sistema calcula los bounding boxes:
   - Regiones: Basado en todas sus edificaciones
   - Mundos: Basado en todas sus regiones con áreas
4. **Persistencia**: Los resultados se guardan en los archivos JSON correspondientes
5. **Visualización**: Las coordenadas calculadas se muestran en la UI

## 📊 Estructura de Coordenadas

### Edificación (Coordenadas Manuales)
```json
{
  "id": "EDIF_1768797417751",
  "worldId": "WORLD_ESPARCRAFT",
  "puebloId": "PUEBLO_1768819105950",
  "name": "Rincon de los condenados",
  "area": {
    "start": { "x": -28, "y": 68, "z": -26 },
    "end": { "x": 1, "y": 86, "z": -74 }
  }
}
```

### Región/Pueblo (Coordenadas Calculadas)
```json
{
  "id": "PUEBLO_1768819105950",
  "worldId": "WORLD_ESPARCRAFT",
  "name": "Hexen",
  "area": {
    "start": { "x": -28, "y": 68, "z": -74 },
    "end": { "x": 1, "y": 86, "z": -26 }
  }
}
```

### Mundo (Coordenadas Calculadas)
```json
{
  "id": "WORLD_ESPARCRAFT",
  "name": "Esparcraft",
  "area": {
    "start": { "x": -100, "y": 0, "z": -150 },
    "end": { "x": 200, "y": 100, "z": 150 }
  }
}
```

## 🧮 Cálculos Realizados

### Bounding Box
Para calcular el bounding box que contiene todas las áreas:
- **X mínima**: Mínimo de todos los start.x y end.x
- **X máxima**: Máximo de todos los start.x y end.x
- **Y mínima**: Mínimo de todos los start.y y end.y
- **Y máxima**: Máximo de todos los start.y y end.y
- **Z mínima**: Mínimo de todos los start.z y end.z
- **Z máxima**: Máximo de todos los start.z y end.z

### Área
```
Área = |end.x - start.x| × |end.z - start.z|
```

### Centro
```
Center.x = (start.x + end.x) / 2
Center.y = (start.y + end.y) / 2
Center.z = (start.z + end.z) / 2
```

## 🚀 Próximos Pasos Sugeridos

1. **Actualización automática**: Cuando se crea/actualiza/elimina una edificación, actualizar automáticamente el área de su región
2. **Actualización en cascada**: Cuando se actualiza el área de una región, actualizar automáticamente el área de su mundo
3. **Visualización en el mapa**: Usar estos bounding boxes para dibujar regiones y mundos en el mapa 2D
4. **Validación de áreas**: Evitar que las áreas de edificaciones se superpongan demasiado
5. **Historial de cambios**: Guardar un historial de cambios en las áreas para poder revertir

## ✅ Estado de Implementación

- ✅ Sistema de cálculo de bounding boxes implementado
- ✅ Funciones de actualización de áreas creadas
- ✅ API endpoint para actualización manual
- ✅ Botones en la UI para actualizar áreas
- ✅ Visualización de coordenadas calculadas
- ✅ Manejo de casos sin edificaciones/sin áreas
- ⏳ Actualización automática (pendiente)
- ⏳ Integración con el mapa 2D (pendiente)

## 📝 Notas

- Las coordenadas de **Edificaciones** se ingresan manualmente por el usuario
- Las coordenadas de **Regiones** se calculan automáticamente desde las edificaciones
- Las coordenadas de **Mundos** se calculan automáticamente desde las regiones
- Si una región no tiene edificaciones, su campo `area` se elimina
- Si un mundo no tiene regiones con áreas, su campo `area` se elimina
- El sistema usa el directorio `data-esparcraft` para almacenar los datos

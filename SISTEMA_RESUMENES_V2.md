# Sistema de Resúmenes de Sesiones v2.0

## 🎯 Implementación: Opción 3 Híbrida

El sistema ahora utiliza una arquitectura híbrida que combina lo mejor de dos mundos:
- **Archivos de resumen independientes** con metadata completa para búsqueda eficiente
- **Historial de resúmenes en la sesión** para mantener registro completo

---

## 📊 Nueva Estructura de Datos

### Tipo `SessionSummary`
```typescript
interface SessionSummary {
  sessionId: string;        // ID de la sesión
  npcId: string;            // ID del NPC
  playerId?: string;        // ID del jugador (opcional)
  playerName?: string;      // Nombre del jugador
  npcName?: string;         // Nombre del NPC
  summary: string;          // Texto del resumen
  timestamp: string;        // Fecha y hora (ISO 8601)
  version: number;          // Número de versión del resumen
}
```

### Tipo `SessionSummaryEntry` (para historial en sesión)
```typescript
interface SessionSummaryEntry {
  summary: string;          // Texto del resumen
  timestamp: string;        // Fecha y hora
  version: number;          // Número de versión
}
```

### Actualización en `Session`
```typescript
interface Session {
  // ... campos existentes
  summaryHistory?: SessionSummaryEntry[];  // ← Nuevo campo
}
```

---

## 🔄 Cambios en el Backend

### 1. `summaryManager` (fileManager.ts)

#### Métodos actualizados:

**`getSummary(sessionId: string): string | null`**
- Mantiene compatibilidad con código existente
- Soporta formato antiguo y nuevo
- Retorna solo el texto del resumen

**`getSummaryData(sessionId: string): SessionSummary | null`**
- Retorna todos los datos del resumen con metadata
- Soporta migración automática de formato antiguo a nuevo
- Campos faltantes en formato antiguo se llenan con valores por defecto

**`saveSummary(sessionId, npcId, playerName, npcName, summary, version)`**
- Guarda resumen con metadata completa
- Versión opcional (por defecto 1)

#### Nuevos métodos:

**`getSummariesByNPC(npcId: string): SessionSummary[]`**
- Obtiene todos los resúmenes de un NPC específico
- Filtra por `npcId`
- Solo retorna resúmenes en formato nuevo (con metadata)

**`getAllSummaries(): SessionSummary[]`**
- Obtiene todos los resúmenes del sistema
- Migra automáticamente formato antiguo a nuevo

### 2. `sessionManager` (fileManager.ts)

#### Nuevos métodos:

**`addSummaryToHistory(id, summary, version): Session | null`**
- Agrega una entrada al historial de resúmenes de la sesión
- Retorna la sesión actualizada

**`getSummaryHistory(id): SessionSummaryEntry[]`**
- Obtiene el historial completo de resúmenes de una sesión
- Array ordenado cronológicamente

**`getNextSummaryVersion(id): number`**
- Calcula la siguiente versión de resumen para una sesión
- Basado en el largo del historial actual

### 3. `handleResumenSesionTrigger` (triggerHandlers.ts)

Actualizado para:
1. Obtener nombre del NPC de la tarjeta: `getCardField(npc?.card, 'name', '')`
2. Obtener nombre del jugador: `session.playerId || session.jugador?.nombre || 'Unknown'`
3. Calcular siguiente versión: `sessionManager.getNextSummaryVersion(session.id)`
4. Guardar resumen con metadata completa
5. Agregar resumen al historial de la sesión

```typescript
// OBTENER METADATA PARA EL RESUMEN
const npcName = getCardField(npc?.card, 'name', '');
const playerName = session.playerId || session.jugador?.nombre || 'Unknown';
const nextVersion = sessionManager.getNextSummaryVersion(session.id);

// GUARDAR RESUMEN CON METADATA COMPLETA
summaryManager.saveSummary(
  session.id,
  npcid,
  playerName,
  npcName,
  summary,
  nextVersion
);

// AGREGAR RESUMEN AL HISTORIAL DE LA SESIÓN
sessionManager.addSummaryToHistory(session.id, summary, nextVersion);
```

---

## 🌐 Nuevas Rutas API

### 1. `/api/npcs/[id]/summaries`
**GET**: Obtiene todos los resúmenes de sesiones de un NPC específico

**Response:**
```json
{
  "success": true,
  "data": {
    "npcId": "NPC_1768825922617",
    "summaries": [
      {
        "sessionId": "SESSION_1769706349009",
        "npcId": "NPC_1768825922617",
        "playerId": "drAke",
        "playerName": "drAke",
        "npcName": "Alvar Braudsson",
        "summary": "...",
        "timestamp": "2026-01-29T17:32:50.077Z",
        "version": 1
      }
    ],
    "count": 1
  }
}
```

**Uso típico:**
```typescript
// Consolidar resúmenes de sesiones de un NPC
const response = await fetch(`/api/npcs/${npcId}/summaries`);
const { data } = await response.json();
const summaries = data.summaries;

// Extraer nombres de jugadores y resúmenes
const playerNames = [...new Set(summaries.map(s => s.playerName))];
const allSummaries = summaries.map(s => s.summary);
```

### 2. `/api/sessions/[id]/summaries`
**GET**: Obtiene el historial completo de resúmenes de una sesión

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "SESSION_1769706349009",
    "summaryHistory": [
      {
        "summary": "...",
        "timestamp": "2026-01-29T17:32:50.077Z",
        "version": 1
      },
      {
        "summary": "...",
        "timestamp": "2026-01-30T10:15:23.456Z",
        "version": 2
      }
    ],
    "count": 2
  }
}
```

### 3. `/api/sessions/[id]/summary` (actualizada)
**GET**: Obtiene el último resumen de una sesión (ahora incluye metadata)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "...",              // Texto del resumen (compatibilidad)
    "summaryData": {              // Datos completos (nuevo)
      "sessionId": "SESSION_1769706349009",
      "npcId": "NPC_1768825922617",
      "playerId": "drAke",
      "playerName": "drAke",
      "npcName": "Alvar Braudsson",
      "summary": "...",
      "timestamp": "2026-01-29T17:32:50.077Z",
      "version": 1
    }
  }
}
```

---

## 📦 Estructura de Archivos

### Archivo de Resumen (Nuevo Formato)
```
/data-esparcraft/sessions/summaries/SESSION_1769706349009.json
```

```json
{
  "sessionId": "SESSION_1769706349009",
  "npcId": "NPC_1768825922617",
  "playerId": "drAke",
  "playerName": "drAke",
  "npcName": "Alvar Braudsson",
  "summary": "resumen: ...\ndatos relevantes:\n- ...",
  "timestamp": "2026-01-29T17:32:50.077Z",
  "version": 1
}
```

### Sesión con Historial de Resúmenes
```
/data-esparcraft/sessions/SESSION_1769706349009.json
```

```json
{
  "id": "SESSION_1769706349009",
  "npcId": "NPC_1768825922617",
  "playerId": "drAke",
  "jugador": { "nombre": "drAke" },
  "messages": [],
  "summaryHistory": [
    {
      "summary": "resumen: ...\ndatos relevantes:\n- ...",
      "timestamp": "2026-01-29T17:32:50.077Z",
      "version": 1
    }
  ]
}
```

---

## 🔄 Migración Automática

El sistema es **retrocompatible** con resúmenes en formato antiguo:

### Formato Antiguo:
```json
{
  "summary": "...",
  "timestamp": "2026-01-29T17:32:50.077Z"
}
```

### Formato Nuevo (cuando se guarda nuevamente):
```json
{
  "sessionId": "SESSION_1769706349009",
  "npcId": "NPC_1768825922617",
  "playerId": "drAke",
  "playerName": "drAke",
  "npcName": "Alvar Braudsson",
  "summary": "...",
  "timestamp": "2026-01-29T17:32:50.077Z",
  "version": 1
}
```

**Comportamiento:**
- `getSummary()`: Funciona con ambos formatos
- `getSummaryData()`: Migra automáticamente formato antiguo
- `getSummariesByNPC()`: Solo retorna resúmenes con `npcId` (formato nuevo)
- `getAllSummaries()`: Migra formato antiguo al leer

---

## ✨ Ventajas de la Implementación

### 1. Búsqueda Eficiente
- Puedes obtener todos los resúmenes de un NPC sin cargar sesiones
- Filtrado nativo por `npcId`
- Extracción directa de `playerName` de cada resumen

### 2. Independencia de Datos
- Los resúmenes existen aunque se borren las sesiones
- Los archivos de resumen son independientes y pueden hacerse backup por separado
- Metadata persistente: `npcId`, `playerId`, `playerName`, `npcName`

### 3. Historial Completo
- Cada sesión mantiene su propio historial de resúmenes
- Útil para rollback, análisis de evolución, y auditoría
- Versionamiento automático de resúmenes

### 4. Flexibilidad Futura
- Fácil agregar tags, categorías, relevancia
- Soporte para múltiples resúmenes por sesión (versiones)
- Facilita consolidación de resúmenes por NPC, jugador, fecha, etc.

### 5. Compatibilidad Total
- Código existente sigue funcionando sin cambios
- Migración automática de formato antiguo
- No requiere re-escritura de resúmenes existentes

---

## 🚀 Ejemplos de Uso

### Ejemplo 1: Consolidar Resúmenes de un NPC
```typescript
// Obtener todos los resúmenes del NPC
const response = await fetch(`/api/npcs/${npcId}/summaries`);
const { data } = await response.json();

// Extraer jugadores únicos
const uniquePlayers = [...new Set(data.summaries.map(s => s.playerName))];

// Consolidar resúmenes por jugador
const summariesByPlayer = uniquePlayers.map(playerName => {
  return {
    playerName,
    summaries: data.summaries
      .filter(s => s.playerName === playerName)
      .map(s => s.summary)
  };
});
```

### Ejemplo 2: Obtener Historial de Resúmenes de una Sesión
```typescript
// Obtener historial completo
const response = await fetch(`/api/sessions/${sessionId}/summaries`);
const { data } = await response.json();

// Mostrar evolución de resúmenes
data.summaryHistory.forEach(entry => {
  console.log(`Versión ${entry.version}: ${entry.timestamp}`);
  console.log(entry.summary);
});
```

### Ejemplo 3: Obtener Resumen con Metadata
```typescript
// Obtener último resumen con metadata completa
const response = await fetch(`/api/sessions/${sessionId}/summary`);
const { data } = await response.json();

if (data.summaryData) {
  console.log(`NPC: ${data.summaryData.npcName}`);
  console.log(`Jugador: ${data.summaryData.playerName}`);
  console.log(`Versión: ${data.summaryData.version}`);
  console.log(data.summaryData.summary);
}
```

---

## 📋 Resumen de Cambios

### Archivos Modificados:
1. ✅ `/src/lib/types.ts` - Agregadas interfaces `SessionSummary` y `SessionSummaryEntry`
2. ✅ `/src/lib/fileManager.ts` - Actualizados `summaryManager` y `sessionManager`
3. ✅ `/src/lib/triggerHandlers.ts` - Actualizado `handleResumenSesionTrigger`
4. ✅ `/src/app/api/sessions/[id]/summary/route.ts` - Agregada metadata en respuesta

### Archivos Nuevos:
1. ✅ `/src/app/api/npcs/[id]/summaries/route.ts` - Endpoint para resúmenes por NPC
2. ✅ `/src/app/api/sessions/[id]/summaries/route.ts` - Endpoint para historial de resúmenes

### Archivo de Documentación:
1. ✅ `/SISTEMA_RESUMENES_V2.md` - Este documento

---

## 🎉 Conclusión

La implementación de la **Opción 3 Híbrida** proporciona:
- ✅ Búsqueda eficiente por NPC y jugador
- ✅ Metadata completa en cada resumen
- ✅ Independencia de datos
- ✅ Historial de resúmenes por sesión
- ✅ Compatibilidad total con código existente
- ✅ Migración automática de formato antiguo

El sistema está listo para consolidar resúmenes de sesiones de un NPC y extraer la información necesaria para futuras HTTP Requests.

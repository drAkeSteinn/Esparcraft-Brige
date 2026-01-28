# 📋 Plan de Implementación: Dashboard de Logs de Triggers

## 📖 Descripción General

Implementar un dashboard integral para visualizar y gestionar los logs de todas las llamadas a los triggers del sistema de NPCs. Este dashboard permitirá monitorear, depurar y auditar el comportamiento de los NPCs en tiempo real.

**Objetivos Principales:**
- Visualizar requests enviadas al sistema
- Visualizar prompts construidos y enviados al LLM
- Visualizar respuestas recibidas del LLM
- Implementar sistema de filtros para búsquedas específicas
- Mantener histórico persistente con rotación automática
- Exportar logs para análisis externo

---

## 🎯 Requisitos Funcionales

### RF1. Visualización de Logs
- [ ] Mostrar lista de logs con scroll infinito
- [ ] Colorear según tipo de log (Request/Prompt/Response/Error/System)
- [ ] Mostrar timestamp en formato legible
- [ ] Expandir/colapsar contenido largo (Request/Prompt/Response)
- [ ] Mostrar metadatos: Session ID, NPC ID

### RF2. Consola de Logs
- [ ] Panel con tres secciones separadas:
  - Panel superior: Request completo enviado
  - Panel medio: Prompt completo enviado al LLM
  - Panel inferior: Response recibida del LLM
- [ ] Formateo JSON con syntax highlighting
- [ ] Colores según tipo de contenido

### RF3. Sistema de Filtros
- [ ] Filtro por tipo de log (Request/Prompt/Response/Error/System)
- [ ] Filtro por Session ID
- [ ] Filtro por NPC ID
- [ ] Búsqueda por texto en cualquier campo

### RF4. Estadísticas
- [ ] Contador total de logs
- [ ] Contador por tipo
- [ ] Contador de hoy
- [ ] Contador de errores

### RF5. Persistencia
- [ ] Guardar logs en archivos JSON con rotación diaria
- [ ] Límite de 1000 logs por archivo
- [ ] Mantener solo últimos 7 días
- [ ] Limpieza automática de archivos viejos

### RF6. Exportación
- [ ] Exportar logs como JSON
- [ ] Exportar logs como texto plano
- [ ] Exportar filtrados
- [ ] Copiar individual log al portapapeles

---

## 🏗️ Arquitectura Técnica

### Estructura de Archivos

```
/home/z/my-project/
├── src/
│   ├── lib/
│   │   └── logManager.ts          # Gestor de logs con persistencia
│   ├── app/
│   │   └── api/
│   │       └── logs/
│   │           └── route.ts   # API para obtener/exportar logs
│   └── components/
│       └── dashboard/
│           └── LogsTab.tsx # Componente principal del dashboard
└── logs/                              # Directorio de logs (en .gitignore)
    ├── triggers-2026-01-27.json
    ├── triggers-2026-01-26.json
    └── ...
```

### Flujo de Datos

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   HTTP Client ├────>│  /api/reroute  │────>│ LogManager.add│────>│   Logs DB   │
│   (Juego/UI) │     │    (Trigger)    │     │   (File)     │     │  (Archivos) │
└─────────────┘     └─────────────────┘     └──────────────┘     └─────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │ Logs Dashboard  │
                                                     │   (Browser)     │
                                                     └─────────────────┘
```

---

## 📊 Estructuras de Datos

### 1. LogEntry

```typescript
/**
 * Entrada individual de log
 */
interface LogEntry {
  id: string;                    // ID único: REQ-1738000000001, PROMPT-1738000000002, etc.
  timestamp: string;              // ISO 8601: 2026-01-27T22:30:45.123Z
  type: LogType;                 // Tipo de log
  sessionId?: string;             // ID de la sesión (opcional)
  npcId?: string;                // ID del NPC (opcional)
  data: LogData;                 // Datos del log según tipo
}

/**
 * Tipo de log con su configuración visual
 */
type LogType = 'request' | 'prompt' | 'response' | 'error' | 'system';

/**
 * Datos del log según tipo
 */
interface LogData {
  request?: ChatTriggerPayload | AnyTriggerPayload;  // Para type='request'
  prompt?: string;                                      // Para type='prompt'
  response?: string;                                     // Para type='response'
  error?: string;                                        // Para type='error'
  system?: string;                                       // Para type='system'
}

/**
 * Payload completo de trigger (ejemplo para chat)
 */
interface ChatTriggerPayload {
  mode: 'chat' | 'resumen_sesion' | 'resumen_npc' | 'nuevo_lore';
  npcid?: string;
  playersessionid?: string;
  jugador?: Jugador;
  message?: string;
  lastSummary?: string;
  grimorioTemplates?: GrimorioTemplateConfig[];
  context?: {
    mundo?: any;
    pueblo?: any;
    edificio?: any;
  };
}

interface Jugador {
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
}

interface GrimorioTemplateConfig {
  enabled: boolean;
  templateKey?: string;
  section: string;
}
```

### 2. Estado del Dashboard

```typescript
/**
 * Estado del componente LogsTab
 */
interface LogsState {
  logs: LogEntry[];              // Todos los logs cargados
  loading: boolean;               // Estado de carga
  autoScroll: boolean;            // Auto-scroll al nuevo log
  filters: LogsFilters;           // Filtros activos
  expandedLogs: Set<string>;     // IDs de logs expandidos
  searchTerm: string;             // Término de búsqueda
}

interface LogsFilters {
  types: LogType[];              // Tipos de log a mostrar
  sessionId?: string;              // Filtrar por session
  npcId?: string;                 // Filtrar por NPC
}
```

### 3. Configuración de Visualización

```typescript
/**
 * Esquema de colores según tipo de log
 */
const LOG_TYPE_CONFIG = {
  request: {
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-100',
    icon: '🔵',
    label: 'REQUEST',
    badgeVariant: 'default' as const
  },
  prompt: {
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-900 dark:text-green-100',
    icon: '🟢',
    label: 'PROMPT',
    badgeVariant: 'default' as const
  },
  response: {
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-900 dark:text-amber-100',
    icon: '🟡',
    label: 'RESPONSE',
    badgeVariant: 'default' as const
  },
  error: {
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-100',
    icon: '🔴',
    label: 'ERROR',
    badgeVariant: 'destructive' as const
  },
  system: {
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    borderColor: 'border-gray-200 dark:border-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    icon: '⚪',
    label: 'SYSTEM',
    badgeVariant: 'secondary' as const
  }
} as const;
```

---

## 💾 Estrategia de Persistencia

### 1. Rotación de Archivos

**Política:**
- Un archivo por día con formato: `triggers-YYYY-MM-DD.json`
- Máximo 1000 logs por archivo
- Mantener solo los últimos 7 días
- Limpiar automáticamente archivos más viejos

**Ejemplo:**
```
/logs/
├── triggers-2026-01-27.json  # Hoy (máx 1000 logs)
├── triggers-2026-01-26.json  # Ayer
├── triggers-2026-01-25.json  # Hace 2 días
├── triggers-2026-01-24.json  # Hace 3 días
├── triggers-2026-01-23.json  # Hace 4 días
├── triggers-2026-01-22.json  # Hace 5 días
└── triggers-2026-01-21.json  # Hace 6 días (se borrará mañana)
```

### 2. Estructura del Archivo

```json
{
  "date": "2026-01-27",
  "logs": [
    {
      "id": "REQ-1738000000001",
      "timestamp": "2026-01-27T22:30:45.123Z",
      "type": "request",
      "npcId": "NPC_1768825922617",
      "sessionId": "SESSION_1769079824458",
      "data": {
        "request": {
          "mode": "chat",
          "npcid": "NPC_1768825922617",
          "jugador": { ... },
          "message": "Hola",
          "grimorioTemplates": [ ... ],
          "context": { ... }
        }
      }
    },
    {
      "id": "PROMPT-1738000000002",
      "timestamp": "2026-01-27T22:30:45.456Z",
      "type": "prompt",
      "npcId": "NPC_1768825922617",
      "sessionId": "SESSION_1769079824458",
      "data": {
        "prompt": "Escribe ÚNICAMENTE la próxima respuesta..."
      }
    },
    {
      "id": "RESP-1738000000003",
      "timestamp": "2026-01-27T22:30:46.789Z",
      "type": "response",
      "npcId": "NPC_1768825922617",
      "sessionId": "SESSION_1769079824458",
      "data": {
        "response": "{ \"dialogo\": { \"texto\": \"...\" }, ... }"
      }
    }
  ]
}
```

### 3. Algoritmo de Rotación

```typescript
// Al agregar un log:
async function addLog(entry: LogEntry) {
  const today = getTodayDateString(); // YYYY-MM-DD
  const logFile = `${LOGS_DIR}/triggers-${today}.json`;
  
  // Leer logs existentes
  let logs = await readLogFile(logFile);
  
  // Agregar nuevo log
  logs.push(entry);
  
  // Rotar si excede límite
  if (logs.length > MAX_LOGS_PER_FILE) {
    logs = logs.slice(-MAX_LOGS_PER_FILE);
  }
  
  // Guardar
  await writeLogFile(logFile, logs);
  
  // Limpiar archivos viejos
  await cleanOldLogs();
}

async function cleanOldLogs() {
  const files = await readdir(LOGS_DIR);
  const now = Date.now();
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
  
  for (const file of files) {
    const match = file.match(/triggers-(\d{4}-\d{2}-\d{2})\.json/);
    if (!match) continue;
    
    const fileDate = new Date(match[1], match[2], match[3]).getTime();
    const age = now - fileDate;
    
    if (age > MAX_AGE_MS) {
      await unlink(`${LOGS_DIR}/${file}`);
    }
  }
}
```

---

## 🔧 Puntos de Integración

### PI1. Captura de Request
**Archivo:** `/src/app/api/reroute/route.ts`

```typescript
import { LogManager } from '@/lib/logManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 🔵 LOG REQUEST (completo)
    await LogManager.addLog({
      id: `REQ-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'request',
      npcId: (body as any)?.npcid,
      data: { request: body }
    });

    // ... procesar request normalmente
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // 🔴 LOG ERROR
    await LogManager.addLog({
      id: `ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      data: { error: error.message }
    });
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### PI2. Captura de Prompt
**Archivo:** `/src/lib/triggerHandlers.ts`

```typescript
import { LogManager } from './logManager';

export async function handleChatTrigger(payload: ChatTriggerPayload) {
  // ... construir el prompt
  
  const completePrompt = finalMessages
    .map(m => `[${m.role}]\n${m.content}`)
    .join('\n\n');

  // 🟢 LOG PROMPT (antes de enviar al LLM)
  await LogManager.addLog({
    id: `PROMPT-${session.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'prompt',
    sessionId: session.id,
    npcId: npcid,
    data: { prompt: completePrompt }
  });

  // Save prompt to session
  sessionManager.update(session.id, {
    lastPrompt: completePrompt,
    jugador: session.jugador
  });

  // Call LLM
  const response = await callLLM(finalMessages);

  // 🟡 LOG RESPONSE (después de recibir respuesta)
  await LogManager.addLog({
    id: `RESP-${session.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'response',
    sessionId: session.id,
    npcId: npcid,
    data: { response: response }
  });

  return { response, sessionId: session.id };
}
```

### PI3. Captura de Sistema
```typescript
// Ejemplo: Limpiar logs
await LogManager.addLog({
  id: `SYS-${Date.now()}`,
  timestamp: new Date().toISOString(),
  type: 'system',
  data: { system: 'Logs cleared manually by user' }
});

// Ejemplo: Rotación automática
await LogManager.addLog({
  id: `SYS-${Date.now()}`,
  timestamp: new Date().toISOString(),
  type: 'system',
  data: { system: 'Log file rotated: triggers-2026-01-27.json exceeded limit' }
});
```

---

## 📅 Cronograma de Implementación

### Fase 1: Infraestructura de Logs (30-45 min)
- [ ] Crear `/src/lib/logManager.ts` con clase `LogManager`
- [ ] Crear directorio `/logs`
- [ ] Agregar `/logs` a `.gitignore`
- [ ] Implementar rotación de archivos
- [ ] Implementar limpieza de archivos viejos
- [ ] Tests: Crear, leer, rotar, limpiar archivos

### Fase 2: API Endpoints (20-30 min)
- [ ] Crear `/src/app/api/logs/route.ts`
- [ ] Implementar GET `/api/logs` con parámetro `limit`
- [ ] Implementar GET `/api/logs/{id}` para log individual
- [ ] Implementar DELETE `/api/logs` para limpiar todo
- [ ] Tests: Obtener logs, paginación, limpieza

### Fase 3: Integración de Logging (30-40 min)
- [ ] Modificar `/src/app/api/reroute/route.ts` - LOG REQUEST
- [ ] Modificar `/src/lib/triggerHandlers.ts` - LOG PROMPT
- [ ] Modificar `/src/lib/triggerHandlers.ts` - LOG RESPONSE
- [ ] Modificar otros triggers (resumen, lore) para logs
- [ ] Tests: Verificar captura de logs en cada endpoint

### Fase 4: Componentes Base de UI (40-50 min)
- [ ] Crear `/src/components/dashboard/LogsTab.tsx`
- [ ] Implementar componente `LogEntryCard` con expansión
- [ ] Implementar componente `LogFilters` con checkboxes
- [ ] Implementar componente `LogStatistics` con contadores
- [ ] Implementar componente `LogToolbar` con acciones
- [ ] Tests: Renderizado, expansión, filtros

### Fase 5: Funcionalidad Principal del Dashboard (45-60 min)
- [ ] Implementar fetch de logs desde API
- [ ] Implementar coloreado según tipo de log
- [ ] Implementar auto-scroll al nuevo log
- [ ] Implementar búsqueda de logs
- [ ] Implementar filtros por tipo, sesión, NPC
- [ ] Tests: Flujo completo de visualización

### Fase 6: Características Avanzadas (30-40 min)
- [ ] Implementar expandir/contraer contenido largo
- [ ] Implementar copiar log al portapapeles
- [ ] Implementar exportar logs como JSON
- [ ] Implementar exportar logs como texto
- [ ] Tests: Exportación con filtros

### Fase 7: Integración con Dashboard Principal (15-20 min)
- [ ] Agregar tab "Logs" al Dashboard principal
- [ ] Navegación entre tabs
- [ ] Tests: Cambio de tabs, preservar estado

### Fase 8: Testing y Refinamiento (30-40 min)
- [ ] Testing de flujo completo: Request → Prompt → Response
- [ ] Verificar performance con muchos logs
- [ ] Verificar memory leaks
- [ ] Ajustar colores y estilos
- [ ] Tests finales de integración

**Tiempo Total Estimado:** 3.5 - 4.5 horas

---

## 🎨 Diseño Visual

### 1. Layout General

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Dashboard de Logs de Triggers                    │
│ [🔄 Auto-scroll] [🗑️ Limpiar] [📥 Exportar]    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────────────────────────┐
│  FILTROS           │  ESTADÍSTICAS                       │
│                      │                                    │
│  [x] Request        │  Total: 1,234 logs                 │
│  [x] Prompt         │  Hoy: 87 logs                      │
│  [x] Response       │  Request: 412                       │
│  [x] Error          │  Prompt: 412                       │
│  [x] System         │  Response: 410                     │
│                      │  Error: 12                        │
│                      │  System: 0                         │
│                      │                                    │
│  NPC ID: [______]   │                                    │
│  Session ID: [___] │                                    │
└──────────────────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BÚSQUEDA                                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search logs...                           [Buscar] │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LOGS                                                  │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 🔵 REQUEST                       [14:35:23.456] │     │
│  │ NPC: NPC_1768825922617                  [▼]      │     │
│  │ Session: SESSION_1769079824458               [▶]      │     │
│  │ ┌───────────────────────────────────────────────┐ │     │
│  │ │ {                                    │ │     │     │
│  │ │   "mode": "chat",                  │ │     │     │
│  │ │   "npcid": "NPC_1768825922617",    │ │     │     │
│  │ │   "jugador": {                    │ │     │     │
│  │ │     "nombre": "Gerardo",           │ │     │     │
│  │ │     "raza": "Humano"               │ │     │     │
│  │ │     ...                            │ │     │     │
│  │ │   }                                 │ │     │     │
│  │ │ }                                 │ │     │     │
│  │ └───────────────────────────────────────────────┘ │     │
│  └──────────────────────────────────────────────────────┘      │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 🟢 PROMPT                       [14:35:23.789] │     │
│  │ NPC: NPC_1768825922617                  [▼]      │     │
│  │ Session: SESSION_1769079824458               [▶]      │     │
│  │ [▶ Ver prompt completo (1,234 caracteres)]   │     │
│  └──────────────────────────────────────────────────────┘      │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ 🟡 RESPONSE                      [14:35:26.123] │     │
│  │ NPC: NPC_1768825922617                  [▼]      │     │
│  │ Session: SESSION_1769079824458               [▶]      │     │
│  │ [▶ Ver respuesta completa (456 caracteres)]  │     │
│  │ ┌────────────────────────────────────────────┐ │     │
│  │ │ {                              │ │     │
│  │ │   "dialogo": {               │ │     │
│  │ │     "texto": "...",          │ │     │
│  │ │     ...                    │ │     │
│  │ │   }                        │ │     │
│  │ │ }                            │ │     │
│  │ └────────────────────────────────────────────┘ │     │
│  └──────────────────────────────────────────────────────┘      │
│                                                         │
│  ... (más logs)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Componente de Log Individual (Expandido)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟡 RESPONSE                      [14:35:26.123] [× Cerrar]   │
│ NPC: NPC_1768825922617                  Session: SESSION_1769079824458 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                          │
│  {                                                        │
│    "dialogo": {                                       │
│      "texto": "¿Y tú quién eres? ¿Qué me trae a hablar │
│ contigo?",                                         │
│      ...                                              │
│    }                                                  │
│  }                                                      │
│                                                          │
│  [📋 Copiar JSON]  [📥 Exportar]                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Paleta de Colores

| Tipo | Light Mode | Dark Mode |
|------|------------|------------|
| Request | `bg-blue-50`, `text-blue-900` | `bg-blue-950`, `text-blue-100` |
| Prompt | `bg-green-50`, `text-green-900` | `bg-green-950`, `text-green-100` |
| Response | `bg-amber-50`, `text-amber-900` | `bg-amber-950`, `text-amber-100` |
| Error | `bg-red-50`, `text-red-900` | `bg-red-950`, `text-red-100` |
| System | `bg-gray-50`, `text-gray-700` | `bg-gray-950`, `text-gray-300` |

---

## 🔧 Implementación Técnica

### 1. LogManager Class (Completo)

```typescript
// /src/lib/logManager.ts

import fs from 'fs/promises';
import path from 'path';

// Configuración
const LOGS_DIR = path.join(process.cwd(), 'logs');
const MAX_LOGS_PER_FILE = 1000;
const MAX_DAYS = 7;

// Tipos
export type LogType = 'request' | 'prompt' | 'response' | 'error' | 'system';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  sessionId?: string;
  npcId?: string;
  data: {
    request?: any;
    prompt?: string;
    response?: string;
    error?: string;
    system?: string;
  };
}

// Clase principal
export class LogManager {
  /**
   * Asegurar que el directorio de logs existe
   */
  private static async ensureLogsDir(): Promise<void> {
    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
      // Directorio ya existe
    }
  }

  /**
   * Obtener el nombre del archivo de hoy
   */
  private static getTodayLogFile(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(LOGS_DIR, `triggers-${today}.json`);
  }

  /**
   * Leer todos los logs de un archivo
   */
  private static async readLogFile(logFile: string): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const data = JSON.parse(content);
      return data.logs || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Guardar logs en un archivo
   */
  private static async writeLogFile(logFile: string, logs: LogEntry[]): Promise<void> {
    const data = {
      date: logFile.split('triggers-')[1].split('.')[0],
      logs
    };
    await fs.writeFile(logFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Agregar un nuevo log
   */
  static async addLog(entry: LogEntry): Promise<void> {
    await this.ensureLogsDir();
    
    const logFile = this.getTodayLogFile();
    let logs = await this.readLogFile(logFile);
    
    // Agregar nuevo log
    logs.push(entry);
    
    // Rotar si excede límite
    if (logs.length > MAX_LOGS_PER_FILE) {
      logs = logs.slice(-MAX_LOGS_PER_FILE);
    }
    
    // Guardar
    await this.writeLogFile(logFile, logs);
    
    // Limpiar archivos viejos
    await this.cleanOldLogs();
  }

  /**
   * Limpiar archivos de logs más viejos que MAX_DAYS
   */
  private static async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(LOGS_DIR);
      const now = Date.now();
      const MAX_AGE_MS = MAX_DAYS * 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        // Verificar formato del nombre
        const match = file.match(/triggers-(\d{4}-\d{2}-\d{2})\.json/);
        if (!match) continue;
        
        const fileDate = new Date(match[1], match[2], match[3]).getTime();
        const age = now - fileDate;
        
        if (age > MAX_AGE_MS) {
          try {
            await fs.unlink(path.join(LOGS_DIR, file));
          } catch (error) {
            console.error(`[LogManager] Error deleting old log file ${file}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('[LogManager] Error cleaning old logs:', error);
  }
  }

  /**
   * Obtener todos los logs (con límite opcional)
   */
  static async getLogs(limit: number = 1000): Promise<LogEntry[]> {
    await this.ensureLogsDir();
    
    try {
      const files = await fs.readdir(LOGS_DIR);
      let allLogs: LogEntry[] = [];
      
      // Leer todos los archivos ordenados por nombre (más reciente primero)
      for (const file of files.sort().reverse()) {
        if (!file.startsWith('triggers-')) continue;
        
        const logFile = path.join(LOGS_DIR, file);
        const logs = await this.readLogFile(logFile);
        allLogs = [...allLogs, ...logs];
        
        if (allLogs.length >= limit) break;
      }
      
      return allLogs;
    } catch (error) {
      console.error('[LogManager] Error reading logs:', error);
      return [];
    }
  }

  /**
   * Limpiar todos los logs
   */
  static async clearAll(): Promise<void> {
    try {
      const files = await fs.readdir(LOGS_DIR);
      for (const file of files) {
        if (file.startsWith('triggers-')) {
          await fs.unlink(path.join(LOGS_DIR, file));
        }
      }
    } catch (error) {
      console.error('[LogManager] Error clearing logs:', error);
    }
  }

  /**
   * Obtener logs filtrados
   */
  static async getFilteredLogs(filters: {
    types?: LogType[];
    sessionId?: string;
    npcId?: string;
    searchTerm?: string;
  }): Promise<LogEntry[]> {
    const allLogs = await this.getLogs();
    
    return allLogs.filter(log => {
      // Filtro por tipo
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(log.type)) return false;
      }
      
      // Filtro por sessionId
      if (filters.sessionId && log.sessionId !== filters.sessionId) return false;
      
      // Filtro por npcId
      if (filters.npcId && log.npcId !== filters.npcId) return false;
      
      // Filtro por búsqueda
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const logStr = JSON.stringify(log.data).toLowerCase();
        if (!logStr.includes(filters.searchTerm.toLowerCase())) return false;
      }
      
      return true;
    });
  }
}
```

### 2. API Route (Completo)

```typescript
// /src/app/api/logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LogManager } from '@/lib/logManager';

// GET /api/logs?limit=100
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const type = searchParams.get('type') as LogType | null;
    const sessionId = searchParams.get('sessionId') || undefined;
    const npcId = searchParams.get('npcId') || undefined;
    const searchTerm = searchParams.get('search') || undefined;
    
    const logs = await LogManager.getFilteredLogs({
      types: type ? [type] : undefined,
      sessionId,
      npcId,
      searchTerm
    });
    
    return NextResponse.json({
      success: true,
      data: {
        logs: logs.slice(0, limit),
        total: logs.length,
        filters: { type, sessionId, npcId, searchTerm }
      }
    });
  } catch (error) {
    console.error('[API /logs] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error loading logs' },
      { status: 500 }
    );
  }
}

// DELETE /api/logs
export async function DELETE(request: NextRequest) {
  try {
    await LogManager.clearAll();
    
    return NextResponse.json({
      success: true,
      message: 'All logs cleared successfully'
    });
  } catch (error) {
    console.error('[API /logs] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error clearing logs' },
      { status: 500 }
    );
  }
}
```

### 3. Integración en reroute (Ejemplo)

```typescript
// /src/app/api/reroute/route.ts

import { LogManager } from '@/lib/logManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 🔵 LOG REQUEST ANTES DE PROCESAR
    await LogManager.addLog({
      id: `REQ-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'request',
      npcId: (body as any)?.npcid,
      data: { request: body }
    });

    // ... continuar con el procesamiento normal
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // 🔴 LOG ERROR
    await LogManager.addLog({
      id: `ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      data: { error: error.message || 'Unknown error' }
    });
    
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## ✅ Validación de Requisitos

### Checklist de Implementación

#### Infraestructura
- [ ] Directorio `/logs` creado y en `.gitignore`
- [ ] `LogManager` class implementada
- [ ] Rotación de archivos funcional
- [ ] Limpieza automática de archivos viejos
- [ ] Tests de persistencia pasados

#### API Endpoints
- [ ] GET `/api/logs` retorna logs
- [ ] GET `/api/logs?limit=X` respeta límite
- [ ] GET `/api/logs?type=request` filtra por tipo
- [ ] GET `/api/logs?sessionId=XXX` filtra por sesión
- [ ] GET `/api/logs?npcId=XXX` filtra por NPC
- [ ] GET `/api/logs?search=XXX` busca en contenido
- [ ] DELETE `/api/logs` limpia todos los logs
- [ ] Tests de endpoints con Postman/curl

#### Integración de Logging
- [ ] `/api/reroute` loggea requests
- [ ] `handleChatTrigger` loggea prompts
- [ ] `handleChatTrigger` loggea responses
- [ ] Otros triggers loggean apropiadamente
- [ ] Tests de captura de logs en cada flujo

#### Dashboard UI
- [ ] Componente `LogsTab` renderiza correctamente
- [ ] Coloreado según tipo de log funciona
- [ ] Filtros por tipo funcionan
- [ ] Búsqueda de logs funciona
- [ ] Expansión de logs largos funciona
- [ ] Auto-scroll a nuevo log funciona
- [ ] Estadísticas se actualizan
- [ ] Exportar como JSON funciona
- [ ] Copiar log funciona
- [ ] Responsive en mobile

#### Integración General
- [ ] Tab "Logs" agregado al Dashboard
- [ ] Navegación entre tabs funciona
- [ ] No interfiere con otras funcionalidades
- [ ] Performance aceptable con 1000+ logs

---

## 📝 Notas Adicionales

### Consideraciones de Performance
1. **Lectura de Logs:** Solo leer archivos necesarios según filtros
2. **Scroll Virtual:** Implementar virtual scroll para listas grandes
3. **Lazy Loading:** Cargar logs en lotes de 50 si hay más de 1000
4. **Debouncing:** Implementar debounce en búsqueda

### Consideraciones de UX
1. **Timestamps:** Mostrar en formato relativo "hace 5 min" para logs recientes
2. **Filtros:** Guardar filtros en localStorage para persistencia
3. **Auto-scroll:** Toggle para habilitar/deshabilitar
4. **Dark Mode:** Asegurar que todos los colores funcionen en modo oscuro

### Consideraciones de Seguridad
1. **Datos Sensibles:** Los logs pueden contener datos del jugador y conversaciones privadas
2. **Exportación:** Permitir exportar solo logs filtrados
3. **Limpieza:** Confirmación antes de limpiar todos los logs

### Consideraciones de Debugging
1. **Verbose Logging:** Agregar logs de debug en LogManager para solucionar problemas
2. **Error Handling:** Manejar errores de escritura/lectura de archivos
3. **Corruption Recovery:** Validar JSON antes de leer archivos

---

## 🎯 Próximos Pasos

1. **Revisión del Plan:** Validar que todos los requisitos están cubiertos
2. **Inicio de Fase 1:** Crear `LogManager` class
3. **Testing Continuo:** Testing de cada fase antes de pasar a la siguiente
4. **Ajustes según Feedback:** Modificar plan según resultados de tests

---

**Versión del Plan:** 1.0  
**Fecha de Creación:** 2026-01-27  
**Última Actualización:** 2026-01-27  
**Estado:** Pendiente de Implementación

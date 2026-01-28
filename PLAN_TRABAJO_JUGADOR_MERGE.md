# Plan de Trabajo: Merge Incremental de Datos del Jugador en Sesiones

## Fecha
2026-01-26

## Idea Propuesta (Aprobada por Usuario)

### Lógica de "Merge Incremental"

**En cada interacción con el NPC:**
1. El cliente envía un payload con datos del jugador (puede ser completo o parcial)
2. El sistema **mezcla** los nuevos datos con los datos existentes de la sesión
3. Los nuevos datos **sobrescriben** los existentes
4. Los datos que no vienen en el payload **se conservan** de la sesión anterior
5. El resultado se guarda en la sesión como snapshot actualizado del jugador

**Ejemplos:**

**Caso 1: Payload completo (primera interacción)**
```json
// Request 1 (nueva sesión)
{
  "jugador": {
    "nombre": "Gerardo Lopez",
    "raza": "Humano",
    "nivel": "10",
    "almakos": "1000",
    "deuda": "100",
    "piedras_del_alma": "5",
    "salud_actual": "10",
    "reputacion": "6",
    "hora": "10:30pm",
    "clima": "soleado"
  }
}

// Sesión después de Request 1
{
  "id": "SESSION_XXX",
  "jugador": {
    "nombre": "Gerardo Lopez",
    "raza": "Humano",
    "nivel": "10",
    "almakos": "1000",
    "deuda": "100",
    "piedras_del_alma": "5",
    "salud_actual": "10",
    "reputacion": "6",
    "hora": "10:30pm",
    "clima": "soleado"
  }
}
```

**Caso 2: Payload parcial (solo datos que cambiaron)**
```json
// Request 2 (misma sesión, el jugador perdió salud y aumentó deuda)
{
  "jugador": {
    "salud_actual": "5",   // ← Solo estos 2 campos
    "deuda": "150"          // ← El resto se conserva
  }
}

// Sesión después de Request 2 (merge incremental)
{
  "id": "SESSION_XXX",
  "jugador": {
    "nombre": "Gerardo Lopez",    // ← Conservado (del request anterior)
    "raza": "Humano",             // ← Conservado
    "nivel": "10",                // ← Conservado
    "almakos": "1000",            // ← Conservado
    "deuda": "150",               // ← ACTUALIZADO (sobrescrito)
    "piedras_del_alma": "5",      // ← Conservado
    "salud_actual": "5",          // ← ACTUALIZADO (sobrescrito)
    "reputacion": "6",            // ← Conservado
    "hora": "10:30pm",            // ← Conservado
    "clima": "soleado"            // ← Conservado
  }
}
```

**Caso 3: Payload vacío (usa datos existentes)**
```json
// Request 3 (cliente no envía datos del jugador)
{
  // Sin campo "jugador"
}

// Sesión después de Request 3 (sin cambios)
{
  "id": "SESSION_XXX",
  "jugador": {
    // ← Todos los datos se conservan iguales
    "nombre": "Gerardo Lopez",
    "raza": "Humano",
    "nivel": "10",
    "almakos": "1000",
    "deuda": "150",
    "piedras_del_alma": "5",
    "salud_actual": "5",
    "reputacion": "6",
    "hora": "10:30pm",
    "clima": "soleado"
  }
}
```

**Caso 4: Payload con campos vacíos (conservar anteriores)**
```json
// Request 4 (algunos campos vienen vacíos)
{
  "jugador": {
    "salud_actual": "",     // ← Campo vacío explícito
    "hora": "11:00pm"       // ← Campo con nuevo valor
  }
}

// Sesión después de Request 4
// IMPORTANTE: ¿Qué hacer con salud_actual vacío?
// Opción A: Sobrescribir con vacío (el cliente decidió borrarlo)
// Opción B: Conservar valor anterior (tratar vacío como "no cambiar")

// Recomendación: Opción B (conservar anteriores)
{
  "id": "SESSION_XXX",
  "jugador": {
    "nombre": "Gerardo Lopez",
    "raza": "Humano",
    "nivel": "10",
    "almakos": "1000",
    "deuda": "150",
    "piedras_del_alma": "5",
    "salud_actual": "5",    // ← CONSERVADO (vacío en payload no borra)
    "reputacion": "6",
    "hora": "11:00pm",      // ← ACTUALIZADO
    "clima": "soleado"
  }
}
```

## Beneficios de este Enfoque

### ✅ Para el Cliente (Juego)
- **No necesita rastrear estado completo**: Solo envía lo que cambió
- **Más eficiente**: Payloads más pequeños para interacciones frecuentes
- **Menos complejidad**: No necesita mantener cache local del jugador
- **Resiliencia**: Si hay error, el servidor tiene los últimos datos

### ✅ Para el Backend
- **Stateful por sesión**: Cada sesión mantiene snapshot del jugador
- **Merge simple**: Solo usa `{ ...existente, ...nuevo }`
- **Backwards compatible**: Si el payload trae todos los datos, funciona igual
- **Preview en UI**: Puede cargar datos reales de la sesión

### ✅ Para la Experiencia de Usuario
- **NPC puede referenciar datos históricos**: "La última vez te vi con 5% de salud..."
- **Consistencia**: Los datos del jugador evolucionan naturalmente durante la sesión
- **Debugging**: Se puede ver cómo evolucionó el jugador durante la sesión

## Cambios Necesarios

### 1. Modificar Types (src/lib/types.ts)

```typescript
// Agregar interfaz de Jugador
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
}

// Modificar Session para incluir jugador
export interface Session {
  id: string;
  npcId: string;
  playerId: string;
  jugador?: Jugador;  // ← NUEVO: Snapshot del jugador
  messages: ChatMessage[];
  lastPrompt?: string;
  startTime: string;
  lastActivity: string;
}
```

### 2. Modificar triggerHandlers.ts

#### 2.1 Función auxiliar para merge incremental

```typescript
/**
 * Realiza un merge incremental de datos del jugador
 * - Los nuevos datos sobrescriben los existentes
 * - Los datos que no vienen se conservan
 * - Los campos vacíos en el payload NO borran los existentes
 */
function mergeJugadorData(
  jugadorExistente: Jugador | undefined,
  jugadorNuevo: Jugador | undefined
): Jugador | undefined {
  // Si no hay datos nuevos, conservar existentes
  if (!jugadorNuevo || Object.keys(jugadorNuevo).length === 0) {
    return jugadorExistente;
  }

  // Si no hay datos existentes, usar nuevos (sin merge)
  if (!jugadorExistente) {
    // Filtrar campos vacíos del nuevo objeto
    const jugadorFiltrado = Object.entries(jugadorNuevo)
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

    return Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined;
  }

  // Merge: nuevos sobrescriben existentes
  // Pero ignorar campos vacíos del nuevo
  const merged = { ...jugadorExistente };

  for (const [key, valor] of Object.entries(jugadorNuevo)) {
    // Solo actualizar si el nuevo valor no es vacío
    if (valor !== undefined && valor !== '') {
      (merged as any)[key] = valor;
    }
  }

  return merged;
}
```

#### 2.2 Modificar handleChatTrigger para nueva sesión

```typescript
export async function handleChatTrigger(payload: ChatTriggerPayload): Promise<{ response: string; sessionId: string }> {
  const { message, npcid, playersessionid, jugador, lastSummary: payloadLastSummary, grimorioTemplates: payloadGrimorioTemplates } = payload;

  // Get NPC
  const npc = npcManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = worldManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

  // Get or create session
  let session;
  if (playersessionid) {
    // Sessión existente: hacer merge incremental de jugador
    session = sessionManager.getById(playersessionid);
    if (!session) {
      throw new Error(`Session ${playersessionid} not found`);
    }

    // ✅ MERGE INCREMENTAL: mezclar datos nuevos con existentes
    const jugadorMergeado = mergeJugadorData(session.jugador, jugador);

    // Actualizar sesión con datos mergeados
    sessionManager.update(session.id, {
      jugador: jugadorMergeado
    });

    // Usar datos mergeados para el contexto
    session.jugador = jugadorMergeado;
  } else {
    // Nueva sesión: usar datos del payload
    const jugadorFiltrado = Object.entries(jugador || {})
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});

    session = sessionManager.create({
      npcId: npcid,
      playerId: jugador?.nombre || undefined,
      jugador: Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined,
      messages: []
    });
  }

  // Obtener el último resumen
  const lastSummary = payloadLastSummary || undefined;

  // ✅ OBTENER PLANTILLAS DE GRIMORIO DEL PAYLOAD O CARGAR DEL ARCHIVO
  let grimorioTemplates = payloadGrimorioTemplates;

  if (!grimorioTemplates || grimorioTemplates.length === 0) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'chat-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        grimorioTemplates = config.grimorioTemplates || [];
        console.log('[handleChatTrigger] Configuración de plantillas cargada del archivo:', grimorioTemplates.length, 'plantillas');
      } catch (error) {
        grimorioTemplates = [];
      }
    } catch (error) {
      console.error('[handleChatTrigger] Error cargando configuración de plantillas:', error);
      grimorioTemplates = [];
    }
  }

  // ✅ OBTENER TODAS LAS CARDS DEL GRIMORIO
  const allGrimorioCards = grimorioManager.getAll();

  // ✅ CONSTRUIR CONTEXTO DE VARIABLES PARA REEMPLAZO
  // Usar session.jugador (ya mergeado) para contexto
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    jugador: session.jugador,  // ← DATOS DEL JUGADOR MERGEADOS
    session,
    char: getCardField(npc?.card, 'name', ''),
    mensaje: message,
    userMessage: message,
    lastSummary: lastSummary
  };

  // ✅ CONSTRUIR EL PROMPT COMPLETO CON VARIABLES DE GRIMORIO
  const basePrompt = buildCompleteChatPrompt(message, {
    world,
    pueblo,
    edificio,
    npc,
    session
  }, {
    jugador: session.jugador,  // ← DATOS DEL JUGADOR MERGEADOS
    lastSummary,
    grimorioTemplates
  });

  // ✅ REEMPLAZAR TODAS LAS VARIABLES
  const resolvedPrompt = resolveAllVariablesWithCache(
    basePrompt,
    varContext,
    allGrimorioCards,
    'chat-prompt-base',
    { verbose: false, useCache: true }
  ).result;

  // ✅ CONSTRUIR MENSAJES
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: resolvedPrompt,
      timestamp: new Date().toISOString()
    }
  ];

  messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  // Buscar contexto relevante de embeddings
  let embeddingContext = '';
  try {
    embeddingContext = await EmbeddingTriggers.searchContext(message, {
      namespace: undefined,
      limit: 3,
      threshold: 0.7
    });
  } catch (error) {
    console.error('Error buscando embeddings:', error);
  }

  let finalMessages = messages;
  if (embeddingContext) {
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      finalMessages = [
        {
          ...systemMessage,
          content: `${systemMessage.content}\n\n---\nContexto relevante de documentos:\n${embeddingContext}\n---`
        },
        ...messages.filter(m => m.role !== 'system')
      ];
    }
  }

  // Build complete prompt as text
  const completePrompt = finalMessages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');

  // ✅ ACTUALIZAR SESIÓN CON PROMPT Y JUGADOR
  sessionManager.update(session.id, {
    lastPrompt: completePrompt,
    jugador: session.jugador  // ← Guardar snapshot mergeado
  });

  // Call LLM
  const response = await callLLM(finalMessages);

  // Save messages to session
  sessionManager.addMessage(session.id, {
    role: 'user',
    content: message
  });

  sessionManager.addMessage(session.id, {
    role: 'assistant',
    content: response
  });

  return {
    response,
    sessionId: session.id
  };
}
```

### 3. Modificar RouterTab.tsx para cargar jugador de sesión

```typescript
// En useEffect que carga datos de sesión existente
useEffect(() => {
  const loadSessionData = async () => {
    if (chatForm.playersessionid && chatForm.sessionType === 'exist') {
      try {
        const response = await fetch(`/api/sessions/${chatForm.playersessionid}`);
        const result = await response.json();

        if (result.success && result.data) {
          // ✅ Cargar datos del jugador de la sesión
          if (result.data.jugador) {
            setChatForm(prev => ({
              ...prev,
              jugador: {
                nombre: result.data.jugador.nombre || '',
                raza: result.data.jugador.raza || '',
                nivel: result.data.jugador.nivel || '',
                almakos: result.data.jugador.almakos || '',
                deuda: result.data.jugador.deuda || '',
                piedras_del_alma: result.data.jugador.piedras_del_alma || '',
                salud_actual: result.data.jugador.salud_actual || '',
                reputacion: result.data.jugador.reputacion || '',
                hora: result.data.jugador.hora || '',
                clima: result.data.jugador.clima || ''
              }
            }));
          }

          // Cargar último resumen
          if (result.data.lastPrompt) {
            // Extraer lastSummary del lastPrompt si es necesario
            // O mantener el flujo actual de cargar de /api/sessions/{id}/summary
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      }
    } else {
      // Si es nueva sesión, usar datos de prueba
      setChatForm(prev => ({
        ...prev,
        jugador: {
          nombre: 'Aldric',
          raza: 'Humano',
          nivel: '15',
          almakos: '2500',
          deuda: '0',
          piedras_del_alma: '3',
          salud_actual: '100',
          reputacion: 'Respetado',
          hora: '14:30',
          clima: 'Lluvia ligera'
        }
      }));
    }
  };
  loadSessionData();
}, [chatForm.playersessionid, chatForm.sessionType]);
```

### 4. Modificar API Endpoint de Sesiones

```typescript
// En src/app/api/sessions/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = sessionManager.getById(id);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        jugador: session.jugador || null  // ← Incluir datos del jugador
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. Agregar Datos de Prueba en RouterTab (solución inmediata)

```typescript
// Estado inicial del formulario
const [chatForm, setChatForm] = useState({
  sessionType: 'new' as 'new' | 'exist',
  npcid: '',
  playersessionid: '',
  jugador: {
    nombre: 'Aldric',        // ← Datos de prueba
    raza: 'Humano',
    nivel: '15',
    almakos: '2500',
    deuda: '0',
    piedras_del_alma: '3',
    salud_actual: '100',
    reputacion: 'Respetado',
    hora: '14:30',
    clima: 'Lluvia ligera'
  },
  mensaje: '',
  historyLimit: 10,
  lastSummary: ''
});
```

## Plan de Implementación

### Fase 1: Datos de Prueba en Preview (30 min) 🔴 CRÍTICA
**Objetivo:** Mejorar UX inmediata del preview

1. ✅ Agregar datos de prueba por defecto en RouterTab
2. ✅ Verificar que el preview muestra prompt completo
3. ✅ Testear con NPC Alvar Braudsson

---

### Fase 2: Types y Estructura (30 min) 🔴 CRÍTICA
**Objetivo:** Definir interfaces nuevas

1. ✅ Crear interfaz `Jugador` en types.ts
2. ✅ Modificar `Session` para incluir `jugador?`
3. ✅ Verificar que sessionManager soporta el nuevo campo
4. ✅ Migrar sesiones existentes (opcional - dejar como undefined)

---

### Fase 3: Merge Incremental en Backend (1 hora) 🔴 CRÍTICA
**Objetivo:** Implementar lógica de merge

1. ✅ Crear función `mergeJugadorData()`
2. ✅ Modificar `handleChatTrigger()` para:
   - Nueva sesión: guardar jugador del payload
   - Sesión existente: merge y guardar
3. ✅ Actualizar contexto de variables para usar jugador mergeado
4. ✅ Agregar logs debug para verificar merge

---

### Fase 4: API Endpoint (30 min) 🟡 IMPORTANTE
**Objetivo:** Exponer datos del jugador en API

1. ✅ Modificar `/api/sessions/[id]/route.ts` GET
2. ✅ Incluir `jugador` en response
3. ✅ Verificar que RouterTab puede cargar estos datos

---

### Fase 5: Cargar Jugador en UI (1 hora) 🟡 IMPORTANTE
**Objetivo:** El preview carga datos reales de la sesión

1. ✅ Modificar useEffect en RouterTab para cargar datos de sesión
2. ✅ Poblar `chatForm.jugador` con datos de la sesión
3. ✅ Si no hay datos, usar datos de prueba
4. ✅ Verificar que preview muestra datos correctos

---

### Fase 6: Testing y Validación (1 hora) 🟢 IMPORTANTE
**Objetivo:** Asegurar que todo funciona correctamente

**Test 1: Nueva sesión con payload completo**
```bash
curl -X POST http://localhost:3000/api/v1/reroute \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "chat",
    "npcid": "NPC_1768825922617",
    "message": "Hola",
    "jugador": {
      "nombre": "Gerardo Lopez",
      "raza": "Humano",
      "nivel": "10",
      "almakos": "1000",
      "deuda": "100",
      "piedras_del_alma": "5",
      "salud_actual": "10",
      "reputacion": "6",
      "hora": "10:30pm",
      "clima": "soleado"
    }
  }'
```
✅ Verificar: Sesión creada con datos completos
✅ Verificar: Variables en prompt están resueltas
✅ Verificar: lastPrompt tiene valores reales

---

**Test 2: Segunda interacción con payload parcial**
```bash
curl -X POST http://localhost:3000/api/v1/reroute \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "chat",
    "npcid": "NPC_1768825922617",
    "playersessionid": "SESSION_XXX",
    "message": "Ayuda",
    "jugador": {
      "salud_actual": "5",
      "deuda": "150"
    }
  }'
```
✅ Verificar: Sesión actualizada con merge
✅ Verificar: Nombre, raza, nivel, etc. se conservaron
✅ Verificar: salud_actual y deuda se actualizaron
✅ Verificar: Prompt muestra valores correctos

---

**Test 3: Tercera interacción sin payload de jugador**
```bash
curl -X POST http://localhost:3000/api/v1/reroute \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "chat",
    "npcid": "NPC_1768825922617",
    "playersessionid": "SESSION_XXX",
    "message": "Qué tienes?"
  }'
```
✅ Verificar: Datos del jugador se conservaron
✅ Verificar: Prompt muestra mismos valores que antes

---

**Test 4: Preview en UI con sesión existente**
1. Abrir Router Tab
2. Seleccionar NPC: Alvar Braudsson
3. Seleccionar Session Type: Existente
4. Seleccionar sesión: SESSION_XXX
5. Verificar: Los campos de jugador se llenan con datos de la sesión
6. Verificar: El preview muestra prompt con variables resueltas
7. Verificar: Variables como `{{jugador.salud_actual}}` muestran "5"

---

**Test 5: Verificar SESSION_1769079824458**
1. Revisar archivo de sesión actual
2. Verificar: Si tiene campos de jugador (probablemente no)
3. Si no tiene: Hacer un request con datos de jugador
4. Verificar: Ahora la sesión actualiza con datos del jugador

---

### Fase 7: Documentación (30 min) 🔵 ÚTIL
**Objetivo:** Documentar para desarrolladores

1. ✅ Actualizar DEFINICION_VARIABLES_GRIMORIO.md
2. ✅ Crear API_INTEGRATION.md con ejemplos de payloads
3. ✅ Agregar sección sobre merge incremental

---

## Resumen de Cambios

### Archivos a Modificar:

1. **src/lib/types.ts** (30 min)
   - Crear interfaz `Jugador`
   - Modificar `Session` para incluir `jugador?`

2. **src/lib/triggerHandlers.ts** (1 hora)
   - Crear `mergeJugadorData()`
   - Modificar `handleChatTrigger()`
   - Agregar logs debug

3. **src/app/api/sessions/[id]/route.ts** (30 min)
   - GET endpoint: incluir `jugador` en response

4. **src/components/dashboard/RouterTab.tsx** (1 hora)
   - Estado inicial: datos de prueba
   - useEffect: cargar jugador de sesión existente
   - Mejorar UX del preview

### Tiempo Total Estimado:
- **Fase 1-3 (Core Backend):** ~2 horas
- **Fase 4-5 (Frontend + API):** ~1.5 horas
- **Fase 6 (Testing):** ~1 hora
- **Fase 7 (Documentación):** ~30 min
- **TOTAL:** ~5 horas

---

## Decisiones Pendientes

### 1. ¿Qué hacer con campos vacíos explícitos en el payload?

**Opción A: Sobrescribir con vacío**
```json
// Payload
{ "jugador": { "nombre": "" } }

// Resultado
{ "nombre": "" }  ← El cliente decidió borrarlo
```

**Opción B: Conservar valor anterior**
```json
// Payload
{ "jugador": { "nombre": "" } }

// Resultado
{ "nombre": "Gerardo" }  ← Tratar vacío como "no cambiar"
```

**Recomendación:** Opción B
- Más seguro para evitar datos corruptos
- El cliente puede enviar el campo directamente si quiere borrarlo
- Implementado en la función `mergeJugadorData()` propuesta

---

### 2. ¿Session.jugador debería ser obligatorio u opcional?

**Opción A: Opcional (`jugador?: Jugador`)**
- Sesiones antiguas no tienen datos de jugador
- API backward compatible
- Preview en UI debe manejar undefined

**Opción B: Obligatorio (`jugador: Jugador`)**
- Siempre hay datos (aunque sea vacío)
- Más consistente
- Rompe backward compatibility

**Recomendación:** Opción A (opcional)
- Mantiene compatibilidad con sesiones existentes
- Más flexible para casos edge
- Preview en UI puede usar datos de prueba cuando es undefined

---

### 3. ¿Cómo manejar `null` vs `""` vs `undefined`?

**Regla propuesta:**
- `undefined` en payload: conservar valor anterior
- `""` en payload: conservar valor anterior (tratar como "no informado")
- `null` en payload: borrar valor (tratar como "borrar explícito")

```typescript
function mergeJugadorData(
  jugadorExistente: Jugador | undefined,
  jugadorNuevo: Jugador | undefined
): Jugador | undefined {
  if (!jugadorNuevo) return jugadorExistente;
  if (!jugadorExistente) {
    // Solo incluir campos no-vacíos
    const jugadorFiltrado = Object.entries(jugadorNuevo)
      .filter(([_, valor]) => valor !== undefined && valor !== '')
      .reduce((obj, [key, valor]) => ({ ...obj, [key]: valor }), {});
    return Object.keys(jugadorFiltrado).length > 0 ? jugadorFiltrado : undefined;
  }

  const merged = { ...jugadorExistente };

  for (const [key, valor] of Object.entries(jugadorNuevo)) {
    if (valor !== undefined && valor !== '') {
      // Solo actualizar si no es vacío
      (merged as any)[key] = valor;
    } else if (valor === null) {
      // null significa borrar explícitamente
      delete (merged as any)[key];
    }
  }

  return merged;
}
```

---

## Checklist de Implementación

### Backend
- [ ] Crear interfaz `Jugador` en types.ts
- [ ] Modificar `Session` interface
- [ ] Implementar `mergeJugadorData()` en triggerHandlers.ts
- [ ] Modificar `handleChatTrigger()` para nueva sesión
- [ ] Modificar `handleChatTrigger()` para sesión existente
- [ ] Actualizar contexto de variables
- [ ] Modificar `/api/sessions/[id]/route.ts` GET
- [ ] Agregar logs debug
- [ ] Verificar sessionManager soporta jugador field

### Frontend
- [ ] Modificar estado inicial de chatForm con datos de prueba
- [ ] Crear useEffect para cargar datos de sesión existente
- [ ] Poblar chatForm.jugador con datos de sesión
- [ ] Manejar caso cuando sesión no tiene datos de jugador
- [ ] Verificar preview muestra datos correctos

### Testing
- [ ] Test 1: Nueva sesión con payload completo
- [ ] Test 2: Segunda interacción con payload parcial
- [ ] Test 3: Tercera interacción sin payload de jugador
- [ ] Test 4: Preview en UI con sesión existente
- [ ] Test 5: Verificar SESSION_1769079824458
- [ ] Verificar logs de merge funcionan correctamente
- [ ] Verificar variables resueltas correctamente

### Documentación
- [ ] Actualizar DEFINICION_VARIABLES_GRIMORIO.md
- [ ] Crear API_INTEGRATION.md
- [ ] Documentar función mergeJugadorData()
- [ ] Agregar ejemplos de payloads

---

## Conclusión

Este plan implementa un sistema de **merge incremental** que:

✅ Permite al cliente enviar solo datos que cambiaron
✅ Conserva datos del jugador entre interacciones
✅ Es backward compatible con sesiones existentes
✅ Mejora UX del preview en UI
✅ Es simple y fácil de mantener

**El resultado final:**
- El NPC siempre tendrá acceso a los datos más recientes del jugador
- El preview en UI mostrará datos reales de la sesión
- El cliente no necesita rastrear estado completo
- Las sesiones guardan snapshot evolutivo del jugador

¿Procedemos con la implementación?

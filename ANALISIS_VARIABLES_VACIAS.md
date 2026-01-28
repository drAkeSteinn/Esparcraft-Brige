# Análisis: Variables de Jugador Vacías en Prompts

## Fecha
2026-01-26

## Problema Reportado
El usuario reporta que las variables del jugador como `{{jugador.nombre}}`, `{{jugador.salud_actual}}`, `{{jugador.deuda}}`, etc. aparecen vacías en el prompt guardado en la sesión `SESSION_1769079824458`.

### Ejemplo del problema
**En la tarjeta del NPC (post_history_instructions):**
```
- {{jugador.nombre}} está a {{jugador.salud_actual}}% de salud, tiene {{jugador.piedras_del_alma}} piedras del alma, y debe {{jugador.deuda}} Almakos.
{{dataplayer}}
```

**Plantilla `dataplayer` en Grimorio:**
```
DATOS DEL AVENTURERO
Nombre: {{jugador.nombre}}
Raza: {{jugador.raza}}
Nivel: {{jugador.nivel}}
Salud actual: {{jugador.salud_actual}}%
Reputacion: {{jugador.reputacion}}
Almakos: {{jugador.almakos}}
Deuda actual: {{jugador.deuda}}
Piedras del Alma: {{jugador.piedras_del_alma}}
```

**Prompt guardado (INCORRECTO):**
```
=== INSTRUCCIONES POST-HISTORIAL ===
-  está a % de salud, tiene  piedras del alma, y debe  Almakos.
...
DATOS DEL AVENTURERO
Nombre:
Raza:
Nivel:
Salud actual: %
Reputacion:
Almakos:
Deuda actual:
Piedras del Alma:
```

## Análisis Técnico

### 1. Cómo funciona el sistema actualmente

**Flujo de datos para requests externas (API):**
```
Client (Game) → POST /api/v1/reroute
  Payload incluye:
    - mode: "chat"
    - npcid: "NPC_1768825922617"
    - message: "Hola"
    - jugador: {
        nombre: "Aldric",
        raza: "Humano",
        nivel: "15",
        salud_actual: "100%",
        almakos: "2500",
        deuda: "0",
        piedras_del_alma: "3",
        reputacion: "Respetado",
        hora: "14:30",
        clima: "Lluvia ligera"
      }
    - lastSummary: "..."

→ triggerHandlers.ts:handleChatTrigger()
  - Extrae jugador del payload
  - Crea varContext con jugador
  - buildCompleteChatPrompt() construye el prompt
  - resolveAllVariablesWithCache() resuelve variables con varContext
  - Variables primarias ({{jugador.nombre}}) → reemplazadas con valores
  - Plantillas de Grimorio ({{dataplayer}}) → expandidas y resueltas
→ prompt completo con variables resueltas
→ Guardado en session.lastPrompt
```

**Flujo de datos para preview en UI:**
```
RouterTab → buildChatPayload()
  Payload incluye:
    - mode: "chat"
    - npcid: "NPC_1768825922617"
    - playersessionid: "SESSION_1769079824458"
    - jugador: {  ← TODOS LOS CAMPOS VACÍOS
        nombre: "",
        raza: "",
        nivel: "",
        salud_actual: "",
        almakos: "",
        deuda: "",
        piedras_del_alma: "",
        reputacion: "",
        hora: "",
        clima: ""
      }

→ POST /api/reroute?preview=true
→ triggerHandlers.ts:previewTriggerPrompt()
  - varContext.jugador = { campos vacíos }
  - buildCompleteChatPrompt()
  - resolveAllVariablesWithCache()
  - Variables {{jugador.*}} → resueltas como strings vacíos ""
→ preview con variables vacías
```

### 2. Estructura de sesiones

**Archivo de sesión (SESSION_1769079824458.json):**
```json
{
  "npcId": "NPC_1768825922617",
  "playerId": "drAke",  ← Solo ID, no objeto completo
  "messages": [...],
  "id": "SESSION_1769079824458",
  "startTime": "2026-01-22T11:03:44.458Z",
  "lastActivity": "2026-01-22T11:05:25.357Z"
  // NO tiene campos: nombre, raza, nivel, salud_actual, etc.
}
```

### 3. Logs del problema

**Request del preview:**
```json
{
  "mode": "chat",
  "npcid": "NPC_1768825922617",
  "message": "",
  "playersessionid": "SESSION_1769079824458"
  // ← NO incluye objeto jugador
}
```

**Debug logs:**
```
[buildCompleteChatPrompt] DEBUG jugador: undefined
[replaceVariables] DEBUG context.jugador: undefined
[previewTriggerPrompt] RESOLVED PROMPT (primeros 200 chars):
Escribe ÚNICAMENTE la próxima respuesta de Alvar Braudsson en reacción al último mensaje de .
                                                                           ↑
                                                              jugador.nombre = vacío
```

## Causa Raíz

### Problema 1: Sesiones no guardan datos completos del jugador
- Las sesiones solo guardan `playerId` (string), no el objeto completo de jugador
- Cuando se carga una sesión, no se pueden recuperar los datos del jugador
- Esto es por diseño actual, pero causa el problema en previews

### Problema 2: UI del Router no tiene datos del jugador
- El Router Tab está diseñado para hacer previews con datos de prueba
- Los campos del jugador en el formulario están vacíos por defecto
- No hay una fuente de datos de donde cargar jugador datos

### Problema 3: Preview muestra variables vacías cuando no hay datos
- Cuando `context.jugador` es `undefined` o tiene campos vacíos
- Todas las variables `{{jugador.*}}` se resuelven como `""`
- Esto causa confusión porque el usuario ve variables vacías y piensa que hay un bug

### Problema 4: La sesión guardada también tiene variables vacías
- El prompt guardado en `SESSION_1769079824458` tiene variables vacías
- Esto indica que la request original tampoco incluyó datos del jugador
- O que el prompt fue guardado en un momento incorrecto del flujo

## ¿Por qué las variables aparecen vacías?

### En la UI del Router (Preview)
1. El usuario selecciona NPC y sesión en RouterTab
2. El formulario `chatForm.jugador` tiene todos los campos en blanco por defecto
3. `buildChatPayload()` envía `jugador: { nombre: "", raza: "", ... }`
4. El backend recibe jugador vacío
5. `replaceVariables()` no encuentra datos, retorna strings vacíos
6. El prompt se genera con variables vacías
7. El usuario ve variables vacías y piensa que hay un error

### En la sesión guardada (SESSION_1769079824458)
Hay dos posibilidades:

**Opción A**: La request original no incluyó datos del jugador
- El cliente (game) hizo un request sin el objeto `jugador`
- El prompt se construyó sin datos de jugador
- Se guardó con variables vacías

**Opción B**: El prompt se guardó en un momento incorrecto
- Revisando el código en `triggerHandlers.ts` línea 238:
  ```typescript
  const completePrompt = finalMessages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');
  sessionManager.update(session.id, { lastPrompt: completePrompt });
  ```
- El `completePrompt` se construye de `finalMessages`
- `finalMessages` incluye el `resolvedPrompt` que ya tiene variables resueltas
- **TEÓRICAMENTE**, el prompt debería tener las variables resueltas

**Recomendación**: Verificar logs de requests externas para confirmar si incluyen datos del jugador

## Recomendaciones

### Recomendación 1: Clarificar el diseño del sistema

**Preguntas para decidir la arquitectura:**

1. **¿Quién es responsable de los datos del jugador?**
   - ¿El sistema guarda y gestiona los datos de jugadores?
   - ¿O solo recibe los datos en cada request (stateless)?

2. **¿Las sesiones deben persistir datos del jugador?**
   - Si sí: modificar estructura de sesiones para incluir jugador object
   - Si no: mantener diseño actual, el cliente envía datos en cada request

3. **¿Qué debe mostrar el preview del Router?**
   - ¿Un preview realista con datos de prueba?
   - ¿O un preview que muestre placeholders de variables?

### Recomendación 2: Solución inmediata para UI (Preview)

**Implementar datos de prueba para previews:**

```typescript
// En RouterTab.tsx
const [chatForm, setChatForm] = useState({
  // ...
  jugador: {
    nombre: 'Aldric',  // ← Datos de prueba por defecto
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
  // ...
});
```

**O permitir que el usuario cargue datos de prueba:**
- Botón "Cargar Jugador de Prueba"
- Carga datos de ejemplo para visualizar el prompt completo

### Recomendación 3: Modificar estructura de sesiones (si aplica)

**Opción A: Guardar datos del jugador en cada sesión**
```typescript
interface Session {
  id: string;
  npcId: string;
  playerId: string;
  jugador?: {  // ← NUEVO: guardar snapshot de jugador
    nombre?: string;
    raza?: string;
    nivel?: string;
    salud_actual?: string;
    almakos?: string;
    deuda?: string;
    piedras_del_alma?: string;
    reputacion?: string;
    hora?: string;
    clima?: string;
  };
  messages: ChatMessage[];
  lastPrompt?: string;  // ← Prompt con variables resueltas
  startTime: string;
  lastActivity: string;
}
```

**Ventajas:**
- Preview en UI puede mostrar datos reales de la sesión
- Historial completo de cómo era el jugador en cada interacción
- No depende de requests externas

**Desventajas:**
- Redundancia de datos (jugador se guarda en cada sesión)
- Mayor tamaño de archivos
- ¿Qué pasa si el jugador cambia entre sesiones?

**Opción B: Crear tabla/collection de jugadores**
```typescript
// schema.prisma
model Jugador {
  id           String   @id @default(cuid())
  playerId     String   @unique  // ID del jugador en el juego
  nombre       String?
  raza         String?
  nivel        String?
  salud_actual String?
  almakos      String?
  deuda        String?
  piedras_del_alma String?
  reputacion   String?
  ultimaActualizacion DateTime @updatedAt
}

// Session
model Session {
  id          String @id
  npcId       String
  playerId    String
  jugador     Jugador @relation(fields: [playerId], references: [id])
  messages    Json
  lastPrompt   String?
  startTime   DateTime
  lastActivity DateTime
}
```

**Ventajas:**
- Datos de jugador centralizados
- Un jugador puede tener múltiples sesiones
- Se puede actualizar el perfil del jugador en un solo lugar

**Desventajas:**
- Más complejidad
- Requiere migrations
- Necesita decidir cómo se sincroniza con el juego

### Recomendación 4: Mejorar experiencia en UI

**Opción A: Mostrar placeholders visuales cuando no hay datos**

En lugar de mostrar:
```
-  está a % de salud, tiene  piedras del alma, y debe  Almakos.
DATOS DEL AVENTURERO
Nombre:
Raza:
Nivel:
```

Mostrar algo más claro:
```
- [jugador.nombre] está a [jugador.salud_actual]% de salud, tiene [jugador.piedras_del_alma] piedras del alma, y debe [jugador.deuda] Almakos.

DATOS DEL AVENTURERO
Nombre: [jugador.nombre]
Raza: [jugador.raza]
Nivel: [jugador.nivel]
Salud actual: [jugador.salud_actual]%
Reputacion: [jugador.reputacion]
Almakos: [jugador.almakos]
Deuda actual: [jugador.deuda]
Piedras del Alma: [jugador.piedras_del_alma]

⚠️ Preview sin datos de jugador. Los campos aparecerán completos cuando el cliente del juego envíe los datos.
```

**Opción B: Modo de visualización "Crudo" vs "Resuelto"**

```typescript
[Modo de Vista: ▼ Resuelto | Crudo]

// "Resuelto": muestra el prompt con valores (vacíos si no hay datos)
// "Crudo": muestra el prompt con los placeholders de variables {{jugador.nombre}}
```

**Opción C: Permitir editar datos de prueba en tiempo real**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Datos del Jugador (Preview)</CardTitle>
    <CardDescription>Estos datos son solo para preview. El cliente del juego enviará los datos reales.</CardDescription>
  </CardHeader>
  <CardContent>
    <Input
      label="Nombre"
      value={chatForm.jugador.nombre}
      onChange={(e) => setChatForm({...chatForm, jugador: {...chatForm.jugador, nombre: e.target.value}})}
    />
    <Input label="Raza" ... />
    {/* ... más campos ... */}
    <Button onClick={() => setJugadorToTestValues()}>
      Usar Datos de Prueba
    </Button>
  </CardContent>
</Card>
```

### Recomendación 5: Documentar el flujo esperado

**Crear documentación clara sobre:**

1. **Cómo el cliente del juego debe hacer requests:**
   ```bash
   curl -X POST http://your-domain.com/api/v1/reroute \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "chat",
       "npcid": "NPC_1768825922617",
       "message": "Hola",
       "jugador": {
         "nombre": "Aldric",
         "raza": "Humano",
         "nivel": "15",
         "salud_actual": "100",
         "almakos": "2500",
         "deuda": "0",
         "piedras_del_alma": "3",
         "reputacion": "Respetado",
         "hora": "14:30",
         "clima": "Lluvia ligera"
       },
       "lastSummary": "..."
     }'
   ```

2. **Qué espera el sistema en cada payload:**
   - Campos obligatorios
   - Campos opcionales
   - Formato esperado

3. **Cómo se resuelven las variables:**
   - Variables primarias vs plantillas
   - Orden de resolución
   - Qué pasa si un dato no está presente

## Plan de Trabajo Propuesto

### Fase 1: Solución Inmediata (1-2 horas)
**Objetivo:** Mejorar la experiencia del usuario en el preview

1. ✅ Agregar datos de prueba por defecto en RouterTab
   - Modificar `chatForm.jugador` para tener valores de ejemplo
   - Permitir que el usuario vea un preview completo y realista

2. ✅ Mejorar visualización cuando no hay datos
   - Mostrar placeholders claros cuando variables no están resueltas
   - Agregar un mensaje explicativo: "Preview sin datos del cliente"

3. ✅ Botón "Cargar Jugador de Prueba"
   - Permite al usuario reemplazar los datos de prueba con valores de ejemplo
   - Facilita visualizar diferentes escenarios

### Fase 2: Arquitectura de Datos (2-4 horas)
**Objetivo:** Decidir e implementar persistencia de datos de jugador

**Opción A (Recomendada): Modificar sesiones para guardar snapshot de jugador**
1. Modificar `Session` interface para incluir `jugador` object
2. Actualizar `sessionManager` para guardar jugador cuando se crea sesión
3. Actualizar `triggerHandlers.ts` para incluir jugador en session cuando se guarda
4. Actualizar RouterTab para cargar jugador de la sesión cuando se selecciona
5. Agregar migración para sesiones existentes (opcional)

**Opción B: Crear colección de jugadores centralizada**
1. Crear `jugadores` directory o tabla en DB
2. Crear API endpoints: GET/PUT /api/jugadores/{playerId}
3. Modificar triggerHandlers para guardar datos de jugador
4. Actualizar RouterTab para cargar jugador desde API
5. Documentar API para clientes

### Fase 3: Validación y Testing (1-2 horas)
**Objetivo:** Asegurar que el flujo completo funciona

1. Test 1: Request externa con datos de jugador
   - Verificar que variables se resuelven correctamente
   - Verificar que prompt guardado tiene valores

2. Test 2: Preview en UI con datos de prueba
   - Verificar que variables se resuelven con datos de prueba
   - Verificar que preview muestra prompt completo

3. Test 3: Cargar sesión existente
   - Verificar que jugador data se carga de la sesión
   - Verificar que preview muestra datos históricos correctos

4. Test 4: Validar que SESSION_1769079824458 muestra datos correctos
   - Verificar logs del request original
   - Confirmar si el problema fue en el request o en el guardado

### Fase 4: Documentación Final (1 hora)
**Objetivo:** Documentar claramente el sistema para desarrolladores

1. Actualizar DEFINICION_VARIABLES_GRIMORIO.md con:
   - Explicación clara de flujo de datos
   - Ejemplos de payloads correctos
   - Cómo se resuelven variables

2. Crear API_DOCUMENTATION.md con:
   - Endpoints disponibles
   - Payloads esperados
   - Ejemplos de requests/responses

3. Crear TROUBLESHOOTING.md con:
   - Problemas comunes con variables
   - Cómo debugear variables vacías
   - Checklist para validar integración

## Conclusión

El problema de variables vacías NO es un bug en la lógica de resolución de variables, sino una consecuencia de:

1. **Diseño stateless**: El sistema no persiste datos del jugador
2. **Preview sin datos**: La UI no tiene acceso a datos del jugador
3. **Falta de claridad**: No está documentado el flujo esperado

La solución debe abordar:
- **Inmediato**: Mejorar UX del preview con datos de prueba
- **Corto plazo**: Decidir arquitectura de persistencia de jugador
- **Largo plazo**: Documentar completamente el sistema

**Prioridad:**
1. 🟢 Alta: Solución inmediata (datos de prueba en preview)
2. 🟡 Media: Arquitectura de persistencia de jugador
3. 🔵 Baja: Documentación completa (puede hacerse en paralelo)

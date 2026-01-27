# 📋 Reporte de Hallazgos - Router de Triggers y Sistema de Prompt

**Fecha**: 2025-01-13
**Revisor**: Z.ai Code
**Objetivo**: Verificar el estado actual del sistema y asegurar que cumple con los requisitos del proyecto

---

## 📊 Resumen Ejecutivo

El sistema presenta **DUPLICACIÓN CRÍTICA DE LÓGICA** entre el frontend y el backend. El Router Tab implementa su propio constructor de prompts y sistema de reemplazo de variables, en lugar de reutilizar el flujo unificado del backend.

**Estado General**: ⚠️ **ALINEACIÓN INCOMPLETA**

---

## 🎯 Principios del Sistema y Estado de Cumplimiento

### Principio 1: "El Router no debe inventar lógica"
**Estado**: ❌ **VIOLADO**

**Evidencia**:
- El Router Tab tiene ~450 líneas de lógica duplicada en el frontend
- Implementa su propio constructor de prompts y sistema de reemplazo de variables
- Esta lógica ya existe de forma correcta en el backend

**Impacto**: El Router no es un simple simulador, sino una implementación alternativa que puede divergir del comportamiento real.

---

### Principio 2: "El Router debe simular exactamente lo que ocurre cuando una consulta HTTP externa llega al sistema"
**Estado**: ❌ **VIOLADO**

**Evidencia**:
- El Router Tab construye el prompt de forma diferente a la API externa
- El visualizador muestra un prompt que puede no coincidir con el real
- El sistema de reemplazo de variables es diferente en ambos flujos

**Impacto**: Lo que el usuario ve en el Router puede no ser lo que realmente se ejecutará en producción.

---

### Principio 3: "Cualquier interacción de tipo chat debe pasar por un único constructor de prompt antes de enviarse al LLM"
**Estado**: ❌ **VIOLADO**

**Evidencia**:
- Existen múltiples constructores de prompts:
  1. `buildChatPreview()` en `RouterTab.tsx` (frontend)
  2. `buildCompleteChatPrompt()` en `promptBuilder.ts` (backend)
- Existen múltiples sistemas de reemplazo de variables:
  1. `replaceKeys()` en `RouterTab.tsx` (frontend)
  2. `replaceVariables()` en `utils.ts` (backend)
  3. `resolveAllVariables()` en `grimorioUtils.ts` (backend)

**Impacto**: No hay un único flujo garantizado, lo que introduce inconsistencias.

---

## 🔍 Análisis Detallado por Pregunta

### 1. ¿El Trigger Chat y la API externa usan el mismo constructor de prompt?

**Respuesta**: ❌ **NO - CRÍTICO**

**Flujo del Trigger Chat (Frontend)**:
- **Archivo**: `src/components/dashboard/RouterTab.tsx`
- **Función**: `buildChatPreview()` (líneas ~1070-1250)
- **Implementación**:
  ```typescript
  const buildChatPreview = (payload: any) => {
    // Construye el prompt de forma local
    // Usa replaceKeys() (función del frontend)
    // Genera secciones para el visualizador
  }
  ```

**Flujo de la API Externa (Backend)**:
- **Archivo**: `src/lib/triggerHandlers.ts`
- **Función**: `handleChatTrigger()` (líneas 75-254)
- **Implementación**:
  ```typescript
  const basePrompt = buildCompleteChatPrompt(message, {
    world, pueblo, edificio, npc, session
  }, {
    jugador,
    lastSummary,
    grimorioTemplates
  });
  ```

**Problema**:
El Router Tab construye el prompt **de forma local** usando una implementación duplicada, mientras que la API usa el constructor oficial del backend. Esto significa que **el visualizador del Router NO muestra el prompt real que se enviaría al LLM**.

---

### 2. ¿El sistema de replaceKeys es único o está duplicado?

**Respuesta**: ❌ **DUPLICADO - CRÍTICO**

**Sistema 1: Frontend (RouterTab.tsx)**
- **Ubicación**: `src/components/dashboard/RouterTab.tsx`
- **Función**: `replaceKeys()` (líneas 774-977)
- **Características**:
  - Implementación completa de reemplazo de variables
  - Soporte para recursividad (hasta 10 iteraciones)
  - Soporte para keys primarias: `{{jugador.nombre}}`, `{{npc.name}}`, `{{mundo}}`, etc.
  - ~200 líneas de código

**Sistema 2: Backend (utils.ts)**
- **Ubicación**: `src/lib/utils.ts`
- **Función**: `replaceVariables()` y `replaceVariablesWithCache()`
- **Características**:
  - Implementación completa de reemplazo de variables
  - Soporte para recursividad
  - Mismo soporte para keys primarias
  - Versión con cache integrado para rendimiento

**Sistema 3: Backend (grimorioUtils.ts)**
- **Ubicación**: `src/lib/grimorioUtils.ts`
- **Función**: `resolveAllVariables()` y `resolveAllVariablesWithCache()`
- **Características**:
  - Resuelve variables del Grimorio (plantillas)
  - Resuelve variables primarias
  - Cache inteligente
  - Estadísticas de resolución

**Problema**:
Existen **3 implementaciones diferentes** del sistema de reemplazo de variables. Los sistemas 2 y 3 están correctamente integrados en el backend, pero el sistema 1 es una **duplicación innecesaria** que introduce riesgo de divergencia.

---

### 3. ¿El Grimorio se procesa de la misma forma en todos los flujos?

**Respuesta**: ✅ **PARCIALMENTE - PERO CON INCONSISTENCIAS**

**Procesamiento en el Backend (Correcto)**
- **Archivo**: `src/lib/promptBuilder.ts`
- **Función**: `buildCompleteChatPrompt()` (líneas 49-223)
- **Lógica**:
  ```typescript
  // 7. Procesar plantillas de Grimorio activas e insertarlas en sus secciones
  if (templates && templates.length > 0) {
    const allGrimorioCards = grimorioManager.getAll();

    // Agrupar plantillas activas por sección
    const templatesBySection: Record<string, string[]> = {};
    templates.filter(t => t.enabled && t.templateKey).forEach(template => {
      // ... agrupar por sección
    });

    // Procesar cada sección y sus plantillas
    Object.keys(templatesBySection).forEach(sectionId => {
      templateKeys.forEach(templateKey => {
        const templateCard = allGrimorioCards.find(card => card.key === templateKey);
        if (templateCard && templateCard.tipo === 'plantilla') {
          // Expandir la plantilla con variables primarias
          const expanded = (templateCard.plantilla || '').replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, variableKey) => {
            return replaceVariables(match, varContext);
          });
          prompt += `=== ${sectionName.toUpperCase()} ===\n${expanded}\n\n`;
        }
      });
    });
  }

  // Luego resuelve todas las variables con Grimorio
  const result = replaceVariables(prompt, varContext);
  ```

**Función alternativa en triggerHandlers.ts**:
```typescript
const resolvedPrompt = resolveAllVariablesWithCache(
  basePrompt,
  varContext,
  allGrimorioCards,
  'chat-prompt-base',
  { verbose: false, useCache: true }
).result;
```

**Procesamiento en el Frontend (Inconsistente)**
- **Archivo**: `src/components/dashboard/RouterTab.tsx`
- **Función**: `buildChatPreview()` y `processGrimorioTemplates()`
- **Lógica**:
  ```typescript
  const processGrimorioTemplates = (
    templates,
    keyContext,
    grimorioCards
  ) => {
    templates.forEach(template => {
      if (template.enabled && template.templateKey) {
        const templateCard = grimorioCards.find(card => card.key === template.templateKey);
        if (templateCard && templateCard.tipo === 'plantilla') {
          // Expandir la plantilla con variables primarias usando replaceKeys
          const expandedTemplate = replaceKeys(templateCard.plantilla || '', keyContext);
          processedTemplates.push({
            sectionName: sectionInfo.name,
            content: expandedTemplate,
            bgColor: sectionInfo.bgColor,
            templateKey: template.templateKey
          });
        }
      }
    });
    return processedTemplates;
  }
  ```

**Diferencias Críticas**:
1. **Backend usa**: `resolveAllVariablesWithCache()` con sistema de cache inteligente
2. **Frontend usa**: `replaceKeys()` sin cache
3. **Backend tiene**: Estadísticas de resolución, manejo de errores, verbose logging
4. **Frontend carece**: Estas características avanzadas

**Problema**:
El Grimorio se procesa en ambos flujos, pero el frontend usa una implementación simplificada y menos robusta. **Existe riesgo de divergencia** entre el prompt mostrado en el visualizador y el prompt real enviado al LLM.

---

### 4. ¿El visualizador muestra el prompt real o uno reconstruido?

**Respuesta**: ❌ **RECONSTRUIDO (Y POSIBLEMENTE INCORRECTO)**

**Visualizador en RouterTab.tsx**:
- **Ubicación**: `src/components/dashboard/RouterTab.tsx`
- **Función**: `buildChatPreview()` genera `chatPromptSections`
- **Visualización**:
  ```typescript
  const chatPromptData = useMemo(() => buildChatPreview(chatPayload), [...]);
  const chatPromptSections = chatPromptData.sections;

  // En el JSX:
  {chatPromptSections.map((section, index) => (
    <div key={index} className={`rounded-lg border ${section.bgColor}`}>
      <div className="border-b ...">
        <span className="text-sm font-semibold ...">
          {section.label}
        </span>
      </div>
      <pre className="text-sm p-4 whitespace-pre-wrap ...">
        {section.content}
      </pre>
    </div>
  ))}
  ```

**API Preview (Modo Correcto)**:
- **Endpoint**: `/api/reroute?preview=true`
- **Archivo**: `src/app/api/reroute/route.ts`
- **Lógica**:
  ```typescript
  const preview = request.nextUrl.searchParams.get('preview') === 'true';

  if (preview) {
    const previewData = await previewTriggerPrompt(payload);
    return NextResponse.json({
      success: true,
      preview: true,
      data: previewData
    });
  }
  ```

- **Función**: `previewTriggerPrompt()` en `triggerHandlers.ts`
  ```typescript
  export async function previewTriggerPrompt(payload: AnyTriggerPayload) {
    // Usa exactamente el mismo flujo que handleChatTrigger
    const basePrompt = buildCompleteChatPrompt(...);
    const resolvedPrompt = resolveAllVariablesWithCache(...);
    const messages = [{ role: 'system', content: resolvedPrompt }];
    return {
      systemPrompt: messages[0].content,
      messages,
      estimatedTokens: 0,
      lastPrompt: messages.map(m => `[${m.role}]\n${m.content}`).join('\n\n')
    };
  }
  ```

**Problema**:
El visualizador del Router **NO usa el endpoint de preview** de la API. Construye el prompt localmente con una lógica duplicada, lo que significa que:

⚠️ **El visualizador puede mostrar un prompt DIFERENTE al que realmente se envía al LLM**

Esto viola el requisito: *"El visualizador refleje el prompt real. No exista una versión 'preview' distinta."*

---

### 5. ¿El prompt guardado en la sesión es exactamente el enviado al LLM?

**Respuesta**: ✅ **SÍ - CORRECTO**

**Guardado del Prompt en handleChatTrigger**:
- **Archivo**: `src/lib/triggerHandlers.ts`
- **Función**: `handleChatTrigger()` (líneas 75-254)
- **Lógica**:
  ```typescript
  // Línea 160-183: Construir prompt completo
  const basePrompt = buildCompleteChatPrompt(message, {
    world, pueblo, edificio, npc, session
  }, {
    jugador,
    lastSummary,
    grimorioTemplates
  });

  const resolvedPrompt = resolveAllVariablesWithCache(
    basePrompt,
    varContext,
    allGrimorioCards,
    'chat-prompt-base',
    { verbose: false, useCache: true }
  ).result;

  // Línea 186-200: Construir mensajes con el prompt resuelto
  const messages: ChatMessage[] = [
    { role: 'system', content: resolvedPrompt, timestamp: new Date().toISOString() }
  ];
  messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  // Línea 202-228: Agregar contexto de embeddings (síncrono)
  let embeddingContext = '';
  try {
    embeddingContext = await EmbeddingTriggers.searchContext(message, {
      namespace: undefined,
      limit:3,
      threshold: 0.7
    });
  } catch (error) {
    console.error('Error buscando embeddings:', error);
  }

  // Línea 215-228: Si hay embeddings, agregar al prompt
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

  // Línea 230-234: Guardar el prompt COMPLETO (incluyendo embeddings)
  const completePrompt = finalMessages.map(m => `[${m.role}]\n${m.content}`).join('\n\n');
  sessionManager.update(session.id, { lastPrompt: completePrompt });

  // Línea 237: Enviar al LLM
  const response = await callLLM(finalMessages);
  ```

**Verificación**:
✅ El prompt se guarda **DESPUÉS** de agregar los embeddings
✅ El prompt guardado incluye **TODOS** los mensajes (system y user)
✅ El prompt guardado es el que se envía al LLM (`callLLM(finalMessages)`)

**Conclusión**:
El sistema de sesiones guarda **exactamente el mismo prompt** que se envía al LLM, incluyendo cualquier contexto de embeddings añadido dinámicamente.

---

### 6. ¿Los datos del jugador del modo test simulan correctamente el payload HTTP?

**Respuesta**: ✅ **SÍ - CORRECTO**

**Datos del Jugador en RouterTab.tsx**:
- **Ubicación**: `src/components/dashboard/RouterTab.tsx`
- **Estado**: `chatForm.jugador` (líneas 70-89)
- **Campos**:
  ```typescript
  jugador: {
    nombre: '',
    raza: '',
    nivel: '',
    almakos: '',
    deuda: '',
    piedras_del_alma: '',
    salud_actual: '',
    reputacion: '',
    hora: '',
    clima: ''
  }
  ```

**Construcción del Payload**:
- **Función**: `buildChatPayload()` (líneas 690-716)
- **Lógica**:
  ```typescript
  const buildChatPayload = () => {
    const npc = npcs.find(n => n.id === chatForm.npcid);
    if (!npc) return null;

    const world = worlds.find(w => w.id === npc.location?.worldId);
    const pueblo = pueblos.find(p => p.id === npc.location?.puebloId);
    const edificio = edificios.find(e => e.id === npc.location?.edificioId);

    let playersessionid = chatForm.playersessionid;
    if (chatForm.sessionType === 'new') {
      playersessionid = undefined;
    }

    return {
      npcid: chatForm.npcid,
      playersessionid,
      jugador: chatForm.jugador,  // ✅ Datos del jugador del modo test
      message: chatForm.mensaje,
      lastSummary: chatForm.lastSummary,
      grimorioTemplates: plantillaRows,
      context: {
        mundo: world,
        pueblo,
        edificio
      }
    };
  };
  ```

**Envío del Payload**:
- **Función**: `sendRequest()` (líneas 1027-1060)
- **Lógica**:
  ```typescript
  const res = await fetch('/api/reroute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: triggerType.replace('_', '_'),
      ...payload  // ✅ Payload construido con datos del jugador
    })
  });
  ```

**Verificación**:
✅ Los datos del jugador del modo test se incluyen en el payload
✅ El payload enviado es equivalente al payload esperado por la API externa
✅ La estructura del payload coincide con `ChatTriggerPayload` en `types.ts`

**Conclusión**:
El modo test simula **correctamente** el payload HTTP externo. Los datos del jugador ingresados manualmente en la UI se envían correctamente como parte del payload a la API.

---

### 7. ¿Existe algún punto donde el Router ejecuta lógica distinta al flujo externo?

**Respuesta**: ❌ **SÍ - MÚLTIPLES PUNTOS DE DIVERGENCIA**

**Punto 1: Construcción del Prompt**
- **Router UI**: Usa `buildChatPreview()` con `replaceKeys()` (frontend)
- **API Externa**: Usa `buildCompleteChatPrompt()` con `resolveAllVariablesWithCache()` (backend)
- **Impacto**: El prompt mostrado en el visualizador puede ser diferente al prompt real

**Punto 2: Sistema de Reemplazo de Variables**
- **Router UI**: Usa `replaceKeys()` (200 líneas duplicadas en frontend)
- **API Externa**: Usa `resolveAllVariablesWithCache()` (con cache inteligente)
- **Impacto**: Diferencias en rendimiento y comportamiento de variables complejas

**Punto 3: Procesamiento del Grimorio**
- **Router UI**: Usa `processGrimorioTemplates()` con `replaceKeys()`
- **API Externa**: Usa `resolveAllVariablesWithCache()` con cache y estadísticas
- **Impacto**: Riesgo de divergencia en la expansión de plantillas

**Punto 4: Visualizador de Prompt**
- **Router UI**: Muestra prompt construido localmente con lógica duplicada
- **API Externa**: Tiene endpoint `/api/reroute?preview=true` que NO es usado
- **Impacto**: El visualizador muestra un prompt que puede no coincidir con el real

**Punto 5: Integración de Embeddings**
- **Router UI**: NO incluye embeddings en el preview (no llama al backend)
- **API Externa**: Agrega embeddings dinámicamente antes de enviar al LLM
- **Impacto**: El visualizador NO muestra el contexto de embeddings

**Conclusión**:
Existen **múltiples puntos de divergencia** entre el Router y el flujo externo. Esto viola el principio rector: *"El Router no debe inventar lógica. El Router debe simular exactamente lo que ocurre cuando una consulta HTTP externa llega al sistema."*

---

## 📊 Estadísticas del Problema

### Código Duplicado en el Frontend

| Función | Ubicación | Líneas | Descripción |
|---------|-----------|--------|-------------|
| `replaceKeys()` | `RouterTab.tsx` | ~200 | Sistema de reemplazo duplicado |
| `processGrimorioTemplates()` | `RouterTab.tsx` | ~50 | Procesamiento de Grimorio duplicado |
| `buildChatPreview()` | `RouterTab.tsx` | ~200 | Constructor de prompt duplicado |
| **Total Duplicado** | | **~450 líneas** | Código que no debería existir en el frontend |

### Implementaciones Existentes (Correctas) en el Backend

| Archivo | Funciones | Estado | Uso |
|---------|-----------|---------|------|
| `utils.ts` | `replaceVariables()`, `replaceVariablesWithCache()` | ✅ Correcto | Backend (no usado por UI) |
| `grimorioUtils.ts` | `resolveAllVariables()`, `resolveAllVariablesWithCache()` | ✅ Correcto | Backend (no usado por UI) |
| `promptBuilder.ts` | `buildCompleteChatPrompt()` | ✅ Correcto | Backend (no usado por UI) |
| `triggerHandlers.ts` | `previewTriggerPrompt()` | ✅ Correcto | Backend (no usado por UI) |

---

## ⚠️ Problemas Identificados

### CRÍTICOS

1. **Constructor de Prompt Duplicado**
   - El Router Tab tiene su propio constructor de prompts
   - No usa `buildCompleteChatPrompt()` del backend
   - Riesgo: El visualizador muestra un prompt diferente al real

2. **Sistema de Reemplazo de Variables Triplicado**
   - 3 implementaciones diferentes de la misma funcionalidad
   - Riesgo: Divergencia en el comportamiento de variables
   - Mantenimiento: Cualquier cambio debe replicarse 3 veces

3. **Visualizador No Usa Endpoint de Preview**
   - El backend tiene `/api/reroute?preview=true` listo para usar
   - El Router Tab lo ignora y construye el prompt localmente
   - Riesgo: El usuario cree que está viendo el prompt real, pero no

### MODERADOS

4. **Procesamiento del Grimorio Inconsistente**
   - Frontend usa implementación simplificada
   - Backend usa implementación con cache y estadísticas
   - Riesgo: Diferencias en el rendimiento y comportamiento

5. **Sesiones Guardan Prompt Correcto, Pero No Se Usa**
   - El `session.lastPrompt` tiene el prompt real
   - El visualizador no lo consulta para mostrarlo
   - Riesgo: Duplicación de almacenamiento de información

6. **Embeddings No Incluidos en Preview**
   - El backend agrega embeddings dinámicamente antes de enviar al LLM
   - El visualizador del frontend NO muestra este contexto
   - Riesgo: El usuario no ve el prompt completo

---

## ✅ Aspectos Correctos del Sistema

1. **API Unificada**: `/api/reroute` maneja todos los triggers de forma consistente
2. **Guardado de Sesiones**: El prompt guardado es exactamente el enviado al LLM
3. **Simulación de Payload**: Los datos del jugador del modo test construyen un payload correcto
4. **Gestión de Embeddings**: Se integran correctamente antes de enviar al LLM
5. **Soporte de Preview**: El backend ya tiene `previewTriggerPrompt()` implementado

---

## 📌 Notas Importantes

### Sobre la Caché
El backend tiene un sistema de cache inteligente en `templateCache.ts`. El frontend no tiene cache, lo que significa:
- El backend es más eficiente en resoluciones repetidas
- El frontend reconstruye el prompt desde cero cada vez
- La divergencia en rendimiento puede ser significativa

### Sobre las Estadísticas
El backend registra estadísticas de resolución de variables en `grimorioStats.ts`:
- Número de variables resueltas
- Número de variables que retornaron vacío
- Número de errores
- Tiempo de ejecución

El frontend no tiene estas estadísticas, lo que dificulta el debugging.

### Sobre Embeddings
Los embeddings se agregan dinámicamente en `handleChatTrigger()` (líneas 202-228) DESPUÉS de resolver las variables. Esto significa:
- El prompt final incluye embeddings
- El `session.lastPrompt` incluye embeddings
- El visualizador del Router (que no llama al backend) NO incluye embeddings

**Esto es otra fuente de divergencia**.

---

## 📊 Resumen Final

| Aspecto | Estado | Nota |
|----------|--------|-------|
| Constructor de Prompt Unificado | ❌ Duplicado | Frontend y backend tienen implementaciones diferentes |
| Sistema de Reemplazo de Variables | ❌ Triplicado | 3 implementaciones distintas |
| Procesamiento de Grimorio | ⚠️ Inconsistente | Frontend simplificado, backend robusto |
| Visualizador de Prompt | ❌ Incorrecto | Muestra prompt reconstruido, no el real |
| Prompt Guardado en Sesión | ✅ Correcto | Coincide exactamente con el enviado al LLM |
| Simulación de Payload HTTP | ✅ Correcta | Datos del jugador se envían correctamente |
| Integración de Embeddings | ❌ Inconsistente | Preview no muestra embeddings del backend |
| Uso de Endpoint de Preview | ❌ No implementado | Router ignora `/api/reroute?preview=true` |
| Principio Rector | ❌ Violado | El Router inventa lógica en lugar de simular |

---

## 🎯 Conclusión del Reporte

El sistema actual **NO CUMPLE** con los principios establecidos en el documento de instrucciones. Existe una **duplicación crítica de lógica** entre el frontend y el backend, lo que resulta en:

1. **Divergencia de comportamiento**: El visualizador puede mostrar un prompt diferente al real
2. **Mantenimiento costoso**: Cambios deben replicarse en múltiples lugares
3. **Riesgo de errores**: Implementaciones pueden divergir con el tiempo
4. **Pérdida de optimizaciones**: El frontend no usa cache ni estadísticas
5. **Contexto incompleto**: El visualizador no muestra embeddings

**Acción recomendada**: Implementar el plan de refactorización para unificar el flujo y eliminar la lógica duplicada.

---

**Fin del Reporte de Hallazgos**

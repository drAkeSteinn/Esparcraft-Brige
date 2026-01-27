# 🛠️ Plan de Refactorización - Router de Triggers y Sistema de Prompt

**Fecha**: 2025-01-13
**Autor**: Z.ai Code
**Objetivo**: Unificar el flujo de construcción de prompts entre frontend y backend, eliminando la lógica duplicada

---

## 📊 Resumen del Plan

El objetivo es eliminar ~450 líneas de código duplicado en el frontend y hacer que el Router Tab use el backend para todas las operaciones de construcción y preview de prompts.

**Meta**: El Router debe ser un simulador transparente que usa exactamente el mismo flujo que la API externa.

---

## 🎯 Objetivos del Refactor

### Objetivo Principal
Unificar el flujo de construcción de prompts entre el Router Tab (UI) y la API externa, eliminando la lógica duplicada.

### Objetivos Específicos
1. ✅ Eliminar la duplicación del sistema de reemplazo de variables en el frontend
2. ✅ Eliminar la duplicación del constructor de prompts en el frontend
3. ✅ Hacer que el visualizador use el endpoint de preview del backend
4. ✅ Garantizar que el prompt mostrado coincida con el prompt enviado al LLM
5. ✅ Reducir el código del Router Tab en ~450 líneas
6. ✅ Mantener toda la funcionalidad existente sin romper nada

---

## 📋 Estructura del Plan

El plan se divide en **5 fases**:

1. **Fase 1**: Preparación y Documentación (Riesgo: Bajo)
2. **Fase 2**: Eliminar Lógica Duplicada (Riesgo: Medio)
3. **Fase 3**: Implementar Uso de Backend Preview (Riesgo: Medio)
4. **Fase 4**: Validación y Pruebas (Riesgo: Alto)
5. **Fase 5**: Limpieza y Documentación (Riesgo: Bajo)

---

## 📝 Fase 1: Preparación y Documentación

### Objetivo
Preparar el terreno para el refactor asegurando que todo está documentado y que hay pruebas de seguridad.

### Tiempo Estimado
30 minutos

### Tareas

#### 1.1 Documentar el Comportamiento Actual
- [ ] Crear backup del archivo `RouterTab.tsx`
- [ ] Documentar el comportamiento de cada función que será eliminada:
  - `replaceKeys()` - Qué hace, qué keys soporta
  - `processGrimorioTemplates()` - Cómo procesa las plantillas
  - `buildChatPreview()` - Cómo construye el prompt
  - `buildResumenSesionPreview()` - Cómo construye el preview de resumen
  - `buildResumenNPCPreview()` - Cómo construye el preview de NPC
  - `buildResumenEdificioPreview()` - Cómo construye el preview de edificio
  - `buildResumenPuebloPreview()` - Cómo construye el preview de pueblo
  - `buildResumenMundoPreview()` - Cómo construye el preview de mundo
  - `buildNuevoLorePreview()` - Cómo construye el preview de lore

#### 1.2 Crear Pruebas de Referencia
- [ ] Ejecutar el Router Tab con varios casos de prueba:
  - Caso 1: Chat con NPC nuevo
  - Caso 2: Chat con NPC existente y sesión existente
  - Caso 3: Chat con Grimorio templates activas
  - Caso 4: Resumen de sesión
  - Caso 5: Resumen de NPC
  - Caso 6: Resumen de edificio
  - Caso 7: Resumen de pueblo
  - Caso 8: Resumen de mundo
  - Caso 9: Nuevo lore
- [ ] Guardar capturas de pantalla de los prompts generados
- [ ] Guardar los prompts completos en archivos de referencia

#### 1.3 Verificar Endpoint de Preview del Backend
- [ ] Testear manualmente `/api/reroute?preview=true` con curl o Postman
- [ ] Verificar que retorna: `systemPrompt`, `messages`, `lastPrompt`
- [ ] Comparar el resultado con el prompt actual del visualizador
- [ ] Documentar cualquier diferencia encontrada

### Criterios de Aceptación
- [ ] Backup completo de `RouterTab.tsx` creado
- [ ] Comportamiento actual documentado
- [ ] Pruebas de referencia ejecutadas y guardadas
- [ ] Endpoint de preview verificado como funcional

---

## 🗑️ Fase 2: Eliminar Lógica Duplicada

### Objetivo
Eliminar todas las funciones duplicadas de construcción de prompts y reemplazo de variables del frontend.

### Tiempo Estimado
1.5 horas

### Tareas

#### 2.1 Eliminar Sistema de Reemplazo de Variables
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Eliminar función `replaceKeys()` (líneas ~774-977)
- [ ] Eliminar constantes relacionadas con `replaceKeys` (si existen)
- [ ] Buscar y eliminar todos los usos de `replaceKeys` en el archivo
- [ ] Verificar que no queden referencias a la función eliminada

**Archivos a conservar** (backend):
- `src/lib/utils.ts` - `replaceVariables()` y `replaceVariablesWithCache()`
- `src/lib/grimorioUtils.ts` - `resolveAllVariables()` y `resolveAllVariablesWithCache()`

#### 2.2 Eliminar Procesamiento de Grimorio
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Eliminar función `processGrimorioTemplates()` (líneas ~979-1025)
- [ ] Eliminar sección de procesamiento de Grimorio en `buildChatPreview()`
- [ ] Buscar y eliminar todos los usos de `processGrimorioTemplates` en el archivo

**Archivos a conservar** (backend):
- `src/lib/promptBuilder.ts` - Procesamiento de Grimorio en `buildCompleteChatPrompt()`
- `src/lib/grimorioUtils.ts` - `resolveGrimorioVariable()` y funciones relacionadas

#### 2.3 Eliminar Constructores de Preview
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Eliminar función `buildChatPreview()` (líneas ~1070-1250)
- [ ] Eliminar función `buildResumenSesionPreview()`
- [ ] Eliminar función `buildResumenNPCPreview()`
- [ ] Eliminar función `buildResumenEdificioPreview()`
- [ ] Eliminar función `buildResumenPuebloPreview()`
- [ ] Eliminar función `buildResumenMundoPreview()`
- [ ] Eliminar función `buildNuevoLorePreview()`
- [ ] Buscar y eliminar todos los usos de estas funciones
- [ ] Eliminar estados relacionados con los previews si existen

**Archivos a conservar** (backend):
- `src/lib/triggerHandlers.ts` - `previewTriggerPrompt()` (función unificada del backend)

#### 2.4 Actualizar Visualizadores
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Reemplazar visualizadores que usan `buildChatPreview()` por nuevos estados que recibirán datos del backend
- [ ] Mantener la estructura visual de los componentes (cards, colores, etc.)
- [ ] Solo cambiar la fuente de los datos (de local a backend)

### Criterios de Aceptación
- [ ] Todas las funciones de reemplazo de variables eliminadas del frontend
- [ ] Todos los constructores de preview eliminados del frontend
- [ ] 0 errores de TypeScript después de eliminar las funciones
- [ ] El frontend ahora solo tiene funciones de construcción de payload, no de prompt

---

## 🔌 Fase 3: Implementar Uso de Backend Preview

### Objetivo
Hacer que el Router Tab use el endpoint `/api/reroute?preview=true` para generar los previews de prompts.

### Tiempo Estimado
2 horas

### Tareas

#### 3.1 Crear Hook de Preview del Backend
**Nuevo archivo**: `src/hooks/usePromptPreview.ts`

**Implementación**:
```typescript
import { useState, useCallback } from 'react';

export function usePromptPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPrompt = useCallback(async (payload: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reroute?preview=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error en preview del prompt');
      }

      return data.data; // { systemPrompt, messages, lastPrompt }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { previewPrompt, loading, error };
}
```

#### 3.2 Actualizar RouterTab.tsx para Usar Preview del Backend
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Importar hook `usePromptPreview`
- [ ] Crear estados para guardar los resultados del preview del backend:
  ```typescript
  const [chatPreview, setChatPreview] = useState<any>(null);
  const [resumenSesionPreview, setResumenSesionPreview] = useState<any>(null);
  // ... otros estados para cada tipo de preview
  ```
- [ ] Usar `usePromptPreview` en el componente
- [ ] Llamar a `previewPrompt(payload)` cuando cambie el formulario
- [ ] Guardar el resultado en los estados correspondientes
- [ ] Actualizar los visualizadores para usar estos estados

#### 3.3 Implementar Debouncing para Previews
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Usar `useMemo` o `useCallback` con debounce para evitar llamar al preview en cada cambio
- [ ] Esperar 300-500ms después de que el usuario deje de escribir
- [ ] Solo llamar al preview si hay datos suficientes (NPC seleccionado, etc.)

**Implementación sugerida**:
```typescript
import { useEffect, useMemo } from 'react';

// Debounce del preview
useEffect(() => {
  const timer = setTimeout(() => {
    if (chatPayload && chatPayload.npcid) {
      previewPrompt(chatPayload).then(result => {
        setChatPreview(result);
      }).catch(err => {
        console.error('Error en preview:', err);
      });
    }
  }, 500);

  return () => clearTimeout(timer);
}, [chatPayload, previewPrompt]);
```

#### 3.4 Actualizar Visualizadores para Mostrar Prompt del Backend
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Modificar el JSX del visualizador de Chat para usar `chatPreview`
- [ ] Mostrar loading state mientras se obtiene el preview
- [ ] Mostrar error si hay
- [ ] Extraer secciones del prompt del backend para mantener el formato visual
- [ ] Actualizar todos los visualizadores (resumen, NPC, edificio, pueblo, mundo, lore)

**Migración del formato**:
- El backend devuelve `systemPrompt` (string completo)
- Necesitamos parsear `systemPrompt` en secciones para mantener el formato visual actual
- Podemos agregar un delimitador en `promptBuilder.ts` o parsear las secciones por título

**Opción sugerida**: Modificar `previewTriggerPrompt()` para devolver también las secciones:
```typescript
// En triggerHandlers.ts, función previewTriggerPrompt():
return {
  systemPrompt: messages[0].content,
  messages,
  estimatedTokens: 0,
  lastPrompt,
  sections: extractSections(messages[0].content) // Nueva función para extraer secciones
};
```

#### 3.5 Agregar Indicador de "Prompt Real del Backend"
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Agregar un badge o indicador en el visualizador
- [ ] Texto: "Prompt generado por el Backend" o similar
- [ ] Tooltip: "Este prompt es el mismo que se enviará al LLM"
- [ ] Esto aumenta la confianza del usuario en el sistema

### Criterios de Aceptación
- [ ] Hook `usePromptPreview` creado y funcionando
- [ ] Router Tab usa el endpoint `/api/reroute?preview=true`
- [ ] Previews se generan automáticamente con debounce
- [ ] Visualizadores muestran el prompt real del backend
- [ ] Loading states funcionales
- [ ] Error handling implementado
- [ ] Indicador de "Prompt Real del Backend" visible

---

## ✅ Fase 4: Validación y Pruebas

### Objetivo
Verificar que el refactor funciona correctamente y que no hay regresiones.

### Tiempo Estimado
2 horas

### Tareas

#### 4.1 Ejecutar Pruebas de Regresión
**Casos de prueba**:

1. **Chat con NPC Nuevo**
   - [ ] Crear nueva sesión desde el Router
   - [ ] Seleccionar NPC
   - [ ] Ingresar datos del jugador
   - [ ] Verificar que el preview sea correcto
   - [ ] Ejecutar trigger
   - [ ] Verificar que la respuesta del LLM sea correcta
   - [ ] Verificar en pestaña Sesiones que el prompt guardado coincida con el preview

2. **Chat con Sesión Existente**
   - [ ] Seleccionar sesión existente
   - [ ] Verificar que el preview incluya el historial
   - [ ] Ejecutar trigger
   - [ ] Verificar respuesta correcta
   - [ ] Verificar que el historial se actualice

3. **Chat con Grimorio Templates Activas**
   - [ ] Activar varias plantillas del Grimorio en distintas secciones
   - [ ] Verificar que el preview las incluya correctamente
   - [ ] Verificar que las variables se resuelvan
   - [ ] Ejecutar trigger
   - [ ] Verificar que el LLM use las plantillas

4. **Resumen de Sesión**
   - [ ] Seleccionar NPC con sesiones
   - [ ] Verificar preview de resumen
   - [ ] Ejecutar trigger de resumen
   - [ ] Verificar que el resumen se guarde

5. **Resumen de NPC**
   - [ ] Seleccionar NPC con múltiples sesiones
   - [ ] Verificar preview de resumen de NPC
   - [ ] Ejecutar trigger
   - [ ] Verificar que la memoria del NPC se actualice

6. **Resumen de Edificio**
   - [ ] Seleccionar edificio con múltiples NPCs
   - [ ] Verificar preview de resumen de edificio
   - [ ] Ejecutar trigger
   - [ ] Verificar que la memoria del edificio se actualice

7. **Resumen de Pueblo**
   - [ ] Seleccionar pueblo con múltiples edificios
   - [ ] Verificar preview de resumen de pueblo
   - [ ] Ejecutar trigger
   - [ ] Verificar que la memoria del pueblo se actualice

8. **Resumen de Mundo**
   - [ ] Seleccionar mundo con múltiples pueblos
   - [ ] Verificar preview de resumen de mundo
   - [ ] Ejecutar trigger
   - [ ] Verificar que la memoria del mundo se actualice

9. **Nuevo Lore**
   - [ ] Seleccionar alcance y contexto
   - [ ] Verificar preview de nuevo lore
   - [ ] Ejecutar trigger
   - [ ] Verificar que el lore se agregue

#### 4.2 Comparar con Pruebas de Referencia
- [ ] Comparar los prompts del nuevo sistema con los capturados en Fase 1
- [ ] Verificar que sean idénticos (o funcionalmente equivalentes)
- [ ] Documentar cualquier diferencia encontrada
- [ ] Si hay diferencias, investigar y corregir

#### 4.3 Verificar Integración de Embeddings
- [ ] Ejecutar un chat con datos que tendrían embeddings
- [ ] Verificar que el backend agregue los embeddings correctamente
- [ ] Verificar que el `session.lastPrompt` incluya los embeddings
- [ ] Verificar que el preview del Router muestre el contexto de embeddings

#### 4.4 Verificar Performance
- [ ] Medir el tiempo de respuesta del preview del backend
- [ ] Verificar que el debounce hace que la UI sea fluida
- [ ] Comparar con la performance anterior (sin backend)
- [ ] Si es más lento, optimizar (cache, etc.)

#### 4.5 Verificar Errores de TypeScript y ESLint
- [ ] Ejecutar `bun run lint`
- [ ] Corregir 0 errores de TypeScript
- [ ] Corregir 0 errores de ESLint
- [ ] Verificar que no haya warnings nuevos

### Criterios de Aceptación
- [ ] Todas las pruebas de regresión pasan (9/9 casos)
- [ ] Prompts coinciden con pruebas de referencia
- [ ] Embeddings se muestran correctamente en el preview
- [ ] Performance aceptable (< 2s para preview)
- [ ] 0 errores de lint
- [ ] Funcionalidad completa mantenida

---

## 🧹 Fase 5: Limpieza y Documentación

### Objetivo
Limpiar el código, eliminar código muerto y actualizar la documentación.

### Tiempo Estimado
1 hora

### Tareas

#### 5.1 Eliminar Código Muerto
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Buscar variables de estado que ya no se usan
- [ ] Buscar funciones que ya no se llaman
- [ ] Eliminar código comentado
- [ ] Eliminar imports que ya no se usan

#### 5.2 Actualizar Comentarios del Código
**Archivos afectados**: `src/components/dashboard/RouterTab.tsx`

**Acciones**:
- [ ] Agregar comentarios explicativos sobre el uso del backend
- [ ] Documentar el flujo de preview
- [ ] Eliminar comentarios obsoletos

#### 5.3 Actualizar Documentación del Proyecto
**Archivos afectados**: README.md, worklog.md, etc.

**Acciones**:
- [ ] Actualizar README.md si es necesario
- [ ] Agregar entrada en worklog.md sobre el refactor
- [ ] Documentar el nuevo flujo del Router Tab
- [ ] Actualizar cualquier documentación técnica

#### 5.4 Crear Documento de Migración
**Nuevo archivo**: `MIGRACION_ROUTER.md`

**Contenido**:
- [ ] Explicar el cambio arquitectónico (frontend → backend)
- [ ] Documentar las funciones eliminadas
- [ ] Documentar las nuevas funciones/hooks creadas
- [ ] Guía para desarrolladores futuros

#### 5.5 Eliminar Archivos Temporales
**Acciones**:
- [ ] Eliminar backups temporales (si no se necesitan)
- [ ] Eliminar archivos de pruebas temporales
- [ ] Verificar que el build esté limpio

### Criterios de Aceptación
- [ ] Código muerto eliminado
- [ ] Comentarios actualizados y claros
- [ ] Documentación del proyecto actualizada
- [ ] Documento de migración creado
- [ ] Archivos temporales eliminados
- [ ] Build limpio

---

## 📊 Métricas de Éxito

### Métricas del Código
- [ ] **Reducción de líneas**: RouterTab.tsx debe reducirse en ~450 líneas
- [ ] **Reducción de funciones**: Eliminar 8 funciones duplicadas
- [ ] **Complejidad ciclomática**: Reducir la complejidad del archivo

### Métricas de Calidad
- [ ] **Errores de TypeScript**: 0
- [ ] **Errores de ESLint**: 0
- [ **Porcentaje de cobertura de pruebas**: Mantener o mejorar

### Métricas de Funcionalidad
- [ ] **Casos de prueba**: 9/9 casos pasan
- [ ] **Performance**: < 2s para preview
- [ ] **Coincidencia de prompts**: 100% con pruebas de referencia

### Métricas de Arquitectura
- [ ] **Único constructor de prompts**: Solo en el backend
- [ ] **Único sistema de reemplazo**: Solo en el backend
- [ ] **Router como simulador puro**: Frontend solo muestra, no construye

---

## 🚨 Plan de Rollback

Si durante el refactor encontramos problemas graves:

1. **Restaurar Backup**:
   ```bash
   git checkout RouterTab.tsx.backup
   ```

2. **Documentar el Problema**:
   - Describir qué falló
   - Por qué falló
   - Qué necesitamos cambiar en el plan

3. **Ajustar el Plan**:
   - Modificar el plan según lo aprendido
   - Reintentar con el plan ajustado

---

## 📅 Cronograma Sugerido

| Fase | Tareas | Tiempo | Riesgo |
|-------|---------|--------|--------|
| Fase 1: Preparación | 3 tareas | 30 min | Bajo |
| Fase 2: Eliminar Lógica | 4 tareas | 1.5 horas | Medio |
| Fase 3: Backend Preview | 5 tareas | 2 horas | Medio |
| Fase 4: Validación | 5 tareas | 2 horas | Alto |
| Fase 5: Limpieza | 5 tareas | 1 hora | Bajo |
| **Total** | **22 tareas** | **~7 horas** | - |

---

## ✅ Checklist Final del Proyecto

### Antes de Comenzar
- [ ] Reporte de hallazgos leído y entendido
- [ ] Plan de refactorización leído y entendido
- [ ] Backup del proyecto completo creado
- [ ] Tiempo disponible para completar el refactor

### Durante el Refactor
- [ ] Fase 1 completada: Preparación
- [ ] Fase 2 completada: Eliminar lógica duplicada
- [ ] Fase 3 completada: Backend preview
- [ ] Fase 4 completada: Validación
- [ ] Fase 5 completada: Limpieza

### Después del Refactor
- [ ] Todas las métricas de éxito cumplidas
- [ ] Documentación actualizada
- [ ] Equipo notificado del cambio
- [ ] Sistema en producción (si aplica)

---

## 🎯 Conclusión del Plan

Este plan proporciona una guía detallada y segura para refactorizar el sistema de Router de Triggers, eliminando la lógica duplicada y unificando el flujo entre frontend y backend.

**Beneficios esperados**:
1. ✅ Código más mantenible (menos duplicación)
2. ✅ Prompt real mostrado en el visualizador
3. ✅ Riesgo reducido de divergencia
4. ✅ Mejor performance (cache del backend)
5. ✅ Arquitectura más limpia y coherente

**Riesgos**:
- 🟡 Posible regresión si hay edge cases no documentados
- 🟡 Posible aumento de latencia por llamadas al backend
- 🟡 Complejidad de parsing de secciones del prompt

**Mitigaciones**:
- Extensas pruebas de validación
- Comparación con pruebas de referencia
- Debouncing para reducir llamadas
- Plan de rollback claro

---

**Fin del Plan de Refactorización**

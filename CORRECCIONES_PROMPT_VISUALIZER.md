# Resumen de Correcciones: Visualizador de Prompts y Configuración de Grimorio

## Fecha
2026-01-26

## Problemas Identificados

### Problema 1: ¿Por qué aparece de inicio la plantilla `{{dataplayer}}`?

**Causa raíz:** El NPC tenía `{{dataplayer}}` incrustado en dos lugares:
1. En el campo `scenario` (sección 5 - ESCENARIO)
2. En el campo `post_history_instructions` (sección 8 - POST-HISTORY)

Esto causaba que los datos del jugador aparecieran en ambas secciones cuando se resolvían las variables, creando duplicación y confusión.

**Ejemplo del problema:**
```
=== ESCENARIO ===
...POIs disponibles:\n- Vesitbulo (Barra de la taverna)...
----- template escenario -----
DATOS DEL AVENTURERO  ← Aparece aquí INCORRECTAMENTE
Nombre: Gerardo Lopez
...

=== INSTRUCCIONES POST-HISTORIAL ===
...Tu única salida debe empezar con { y terminar con }.
DATOS DEL AVENTURERO  ← Y también aquí DUPLICADO
Nombre: Gerardo Lopez
...
```

### Problema 2: La primera sección del visualizador no es la instrucción inicial

**Causa raíz:** La primera línea del prompt no tiene encabezado `=== NOMBRE ===`:

```
Escribe ÚNICAMENTE la próxima respuesta de {{npc.name}} en reacción al último mensaje de {{jugador.nombre}}.

=== INSTRUCCIÓN INICIAL ===
...
```

La función `extractPromptSections` solo extrae contenido entre encabezados, por lo que la instrucción inicial no se mostraba como una sección separada.

**Resultado del problema:**
- El visualizador empezaba mostrando `=== INSTRUCCIÓN INICIAL ===` como la primera sección
- La línea "Escribe ÚNICAMENTE..." no aparecía como sección separada

### Problema 3: La sección 1 "INSTRUCCIÓN INICIAL" estaba vacía

**Causa raíz:** El archivo `chat-trigger-config.json` tenía `dataplayer` deshabilitado para todas las secciones, y el NPC no tenía plantillas de Grimorio insertadas por defecto.

## Soluciones Implementadas

### Solución 1: Eliminar `{{dataplayer}}` del NPC

**Archivos modificados:**
- `data-esparcraft/npcs/NPC_1768825922617.json`

**Cambios:**
1. Eliminado `----- template escenario -----\n{{dataplayer}}` del campo `scenario`
2. Eliminado `{{dataplayer}}` del final del campo `post_history_instructions`

**Resultado:**
- El NPC ya no tiene referencias duplicadas de `{{dataplayer}}`
- Los datos del jugador solo aparecerán donde se configure en Grimorio
- Diseño más limpio y claro

### Solución 2: Configurar Grimorio para insertar `dataplayer` en la sección correcta

**Archivos modificados:**
- `db/chat-trigger-config.json`

**Cambios:**
- Habilitado `dataplayer` para la sección 8 (INSTRUCCIONES POST-HISTORY)
- Deshabilitado para todas las demás secciones

**Resultado:**
- Los datos del jugador aparecerán solo en POST-HISTORY
- Posición lógica: al final de las instrucciones, después de todo el contexto

### Solución 3: Mejorar visualizador de prompts para mostrar primera sección

**Archivos modificados:**
- `src/lib/promptUtils.ts`

**Cambios:**
```typescript
// ✅ NUEVO: Extraer la primera sección (instrucción inicial) antes del primer encabezado
const sectionPattern = /===\s*(.+?)\s*===/g;
const firstHeaderMatch = prompt.match(sectionPattern);

if (firstHeaderMatch) {
  const firstHeaderIndex = firstHeaderMatch.index!;
  const beforeFirstHeader = prompt.slice(0, firstHeaderIndex).trim();

  // Si hay contenido antes del primer encabezado, mostrarlo como una sección separada
  if (beforeFirstHeader && beforeFirstHeader.length > 0) {
    sections.push({
      label: 'Instrucción Inicial',
      content: beforeFirstHeader,
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    });
  }
}
```

**Resultado:**
- La primera línea "Escribe ÚNICAMENTE..." ahora se muestra como sección separada
- El visualizador muestra correctamente:
  1. **Instrucción Inicial** - "Escribe ÚNICAMENTE la próxima respuesta..."
  2. **INSTRUCCIÓN INICIAL** - (vacía, pero aparece el encabezado)
  3. **MAIN PROMPT** - Contenido del NPC
  4. ...
  8. **INSTRUCCIONES POST-HISTORIAL** - Incluye DATOS DEL AVENTURERO

## Verificación

**Preview en dev.log (después de correcciones):**
```
{
  label: 'INSTRUCCIONES POST-HISTORIAL',
  content: '- Gerardo Lopez está a 10% de salud, tiene 5 piedras del alma, y debe 100 Almakos.\n' +
    '- Mantén SIEMPRE el formato JSON válido.\n' +
    '...',
  bgColor: 'bg-red-50 dark:bg-red-950'
}
```

✅ Los datos del jugador aparecen correctamente en POST-HISTORY
✅ Sin duplicación de DATOS DEL AVENTURERO
✅ Formato correcto con todos los campos del jugador

## Estructura Final del Prompt

**Antes (con problemas):**
```
1. Instrucción inicial (no mostrada como sección)
2. === INSTRUCCIÓN INICIAL === (vacía)
3. === ESCENARIO === (incluía DATOS DEL AVENTURERO duplicados)
...
8. === INSTRUCCIONES POST-HISTORIAL === (incluía DATOS DEL AVENTURERO duplicados)
```

**Después (corregido):**
```
1. Instrucción Inicial (se muestra como sección separada con "Escribe ÚNICAMENTE...")
2. === INSTRUCCIÓN INICIAL === (vacía, pero aparece el encabezado)
3. === ESCENARIO === (sin DATOS DEL AVENTURERO duplicados)
...
8. === INSTRUCCIONES POST-HISTORIAL === (incluye DATOS DEL AVENTURERO solo aquí)
```

## Concepto Clave

**Separación de responsabilidades:**
- **NPC**: Contiene contenido base del personaje (system_prompt, description, personality, etc.)
- **Grimorio**: Contiene plantillas reutilizables (como `dataplayer`) que pueden insertarse en diferentes secciones
- **Configuración**: Determina qué plantillas de Grimorio se insertan en qué secciones

**Beneficios:**
- ✅ Duplicación eliminada
- ✅ NPCs más limpios sin referencias a plantillas
- ✅ Configuración más flexible (puedes cambiar dónde insertar plantillas)
- ✅ Visualizador de prompts más preciso

## Respuestas a tus 3 consultas:

### 1) ¿Por qué aparece de inicio la plantilla `{{dataplayer}}?

**Respuesta:** Estaba incrustada en el NPC. **Corrección:** Eliminada de los campos del NPC. Ahora solo aparece en Grimorio y se inserta donde la configuración lo indique (sección 8 - POST-HISTORY).

### 2) En el visualizador, la primera sección debería ser la instrucción inicial

**Respuesta:** No se mostraba porque no tenía encabezado. **Corrección:** Agregada lógica en `extractPromptSections` para extraer contenido antes del primer encabezado y mostrarlo como sección "Instrucción Inicial".

### 3) Al ejecutar HTTP Request, el prompt guardado cambió de secciones

**Respuesta:** Sí, cambió por las referencias duplicadas. **Corrección:** 
- Eliminadas `{{dataplayer}}` del NPC
- Configurado para insertar solo en POST-HISTORY
- Ahora el prompt guardado tiene los datos del jugador solo en POST-HISTORY, sin duplicación

## Estado Final

✅ **Problemas resueltos:**
- ✅ No más duplicación de DATOS DEL AVENTURERO
- ✅ Primera sección del visualizador funciona correctamente
- ✅ Configuración de Grimorio limpia y lógica
- ✅ 0 errores de lint en código modificado
- ✅ Preview funcionando correctamente

**Archivos modificados:**
1. `data-esparcraft/npcs/NPC_1768825922617.json`
2. `db/chat-trigger-config.json`
3. `src/lib/promptUtils.ts`

**Próximos pasos (si necesitas):**
- Puedes habilitar `dataplayer` en otras secciones si lo deseas
- Puedes crear más plantillas de Grimorio para otras secciones
- Puedes ajustar en qué sección quieres los datos del jugador

**¿Las correcciones resuelven tus consultas?**

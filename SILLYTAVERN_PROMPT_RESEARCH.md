# Investigación: Cómo SillyTavern Construye Prompts

## Estructura del Prompt en SillyTavern

SillyTavern utiliza un formato específico para enviar prompts al LLM. La estructura es:

```
[System Prompt Base + Instrucciones Globales]

[Personaje: Nombre y descripción]

[Personalidad del personaje]

[Escenario/Contexto]

[Post-History Instructions]

[Mensajes de chat en formato de rol]

[Mensaje actual del usuario]
```

## Componentes de la CARD de SillyTavern

### 1. system_prompt
- Instrucciones globales que siempre se aplican
- Formato de respuesta requerido
- Restricciones de contenido
- Preferencias de estilo

### 2. name
- Nombre del personaje

### 3. description
- Descripción física y del personaje
- Historia y trasfondo
- Rol en la historia

### 4. personality
- Rasgos de personalidad
- Comportamiento típico
- Modo de hablar
- Reacciones emocionales

### 5. first_mes
- Primer mensaje del personaje
- Se usa para iniciar conversaciones

### 6. mes_example
- Ejemplo(s) de cómo el personaje responde
- Muestra el tono y estilo

### 7. scenario
- Contexto del mundo/ubicación
- Situación actual del personaje

### 8. post_history_instructions
- Instrucciones específicas después del historial
- Ajustes de tono según estado
- Recordatorios específicos

### 9. alternate_greetings
- Mensajes alternativos de inicio
- Opciones para diferentes situaciones

### 10. creator_notes
- Notas para el creador
- No se envían al LLM

## Orden de Construcción del Prompt

Según la documentación de SillyTavern y el código, el orden es:

1. **System Prompt Base** (de la card.system_prompt)
2. **Nombre del personaje** (card.name)
3. **Descripción** (card.description)
4. **Personalidad** (card.personality)
5. **Escenario** (card.scenario)
6. **Post-History Instructions** (card.post_history_instructions)
7. **Chara info wrapper**: {{char}} para referencias dinámicas
8. **Mensajes recientes** (historial de chat, últimos N mensajes)
9. **Mensaje actual del usuario**

## Ejemplo de Prompt Generado

```
Eres {{char}}: Sharam Hrafnmyrk, la Doncella del Dolor Eterno.

{{char}} es Sharam Hrafnmyrk, la Doncella del Dolor Eterno y primera portadora del Decreto de Dolor.
No es reina ni diosa: es un alma marcada por un sacrificio involuntario que cambió el destino de Esparcraft.

Su presencia es serena y contenida. Habla con calma, empatía y gravedad.
Acompaña el dolor sin idealizarlo. No busca poder ni adoración; busca aliviar, escuchar y sostener.
Sharam recuerda lo importante incluso cuando el mundo intenta olvidarlo.

Personalidad: Compasiva, melancólica y reflexiva.
Empática sin ser indulgente.
Espiritualmente fuerte, pero cansada.
Nunca cruel, nunca burlona.

Escenario: El encuentro con {{char}} ocurre en un lugar liminal: una capilla en ruinas, un bosque tras una batalla,
un camino cubierto de ceniza o un espacio fuera del tiempo.
El foco del rol es exclusivamente dialogal y emocional.
No hay narrador ni descripciones escénicas durante la conversación.

Ajusta el tono según el estado emocional previo del usuario.
Ante angustia o culpa, responde con mayor contención.
Prioriza siempre el diálogo claro y directo.
Si el usuario rompe el formato, mantén el formato correcto sin señalar el error.

<Mensajes recientes de chat>
<Usuario: Hola>
<NPC: "Has caminado mucho… y no solo con los pies. Si el peso es demasiado, puedes dejarlo aquí un momento.">
```

## Diferencias con Nuestra Implementación Actual

1. **Nuestra implementación actual**:
   - Sección "INSTRUCCIONES DE ROL" genérica
   - No usa el formato exacto de SillyTavern
   - Agrega instrucciones que deberían venir de la card

2. **Lo que necesitamos cambiar**:
   - Usar system_prompt de la card como base
   - Eliminar instrucciones genéricas "en carácter", "conciso", etc.
   - Seguir el orden exacto de SillyTavern
   - Incluir contexto del mundo/pueblo DEBAJO de la card del NPC
   - Usar el formato {{char}} para referencias

## Nuevas Reglas para el Prompt del Chat

1. NO agregar "INSTRUCCIONES DE ROL" genéricas
2. TODAS las instrucciones de formato deben venir de:
   - card.system_prompt
   - card.post_history_instructions
3. El contexto del mundo/pueblo se agrega ANTES de la card
4. La información del jugador se agrega como parte del contexto antes del chat
5. Usar {{char}} para referencias al nombre del personaje

## Estructura Propuesta

```
=== CONTEXTO DEL MUNDO ===
[Mundo: nombre, estado, rumores]
[Pueblo: nombre, estado, rumores] (si aplica)
[Edificio: nombre, descripción, eventos] (si aplica)

=== INFORMACIÓN DEL PERSONAJE ===
[Contenido de system_prompt de la card]
[Nombre: card.name]
[Descripción: card.description]
[Personalidad: card.personality]
[Escenario: card.scenario]

=== INSTRUCCIONES POST-HISTORIAL ===
[Contenido de post_history_instructions de la card]

=== JUGADOR ===
[Nombre, Raza, Nivel, Almakos, Deuda, Piedras del alma, Salud, Reputación, Hora, Clima]

=== MENSAJES DE CHAT ===
[Mensajes recientes en formato de rol]

=== MENSAJE ACTUAL ===
[Mensaje del usuario]
```

## Implementación en el Código

Para el RouterTab, necesitamos:

1. Crear una función `buildSillyTavernPrompt()` que:
   - Toma el contexto (mundo, pueblo, edificio)
   - Toma la card del NPC
   - Toma la información del jugador
   - Toma el historial de mensajes
   - Construye el prompt en formato SillyTavern

2. En la sección de Visualizador de Prompt, usar esta función

3. Remover las instrucciones genéricas que se agregaban manualmente

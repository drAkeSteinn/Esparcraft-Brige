# 📜 Ejemplos de Uso con Denizen

Este documento contiene ejemplos completos de cómo integrar el Bridge IA con Denizen.

---

## 🔌 Configuración Básica

### Headers para Webget

Primero, configura los headers necesarios para las peticiones HTTP:

```yaml
# Define headers para las peticiones
- define headers:
    Content-Type: application/json
    Accept: application/json
```

---

## 💬 Ejemplo 1: Chat Básico con NPC

### Escenario
Un jugador interactúa con Alvar el Tabernero.

### Script Denizen

```yaml
# Evento de click en NPC
Alvar_Tabernero_Interact:
  type: entity
  debug: false
  events:
    on right clicks entity:

  # Verificar que el clic fue en Alvar
  - if <entity.name> != "Alvar el Tabernero":
    - stop

  # Obtener la sesión del jugador (guardada en metadata)
  - define player_session_id:<player.flag[alvar_session_id]>

  # Mensaje del jugador (aquí podrías usar un input)
  - define message:<context.message[0].content>

  # Crear el payload
  - definemap data:
      mode: "chat"
      message: "<message>"
      npcid: "NPC_ALVAR_TABERNERO"
      playersessionid: "<player_session_id>"

  # Enviar al Bridge
  - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

  # Procesar la respuesta
  - define response_data:<response.data.parse_json>
  - define npc_response:<response.data>

  # Guardar el session ID para futuras interacciones
  - flag player alvar_session_id:<response_data.sessionid>

  # Narrar la respuesta del NPC
  - narrate "<&a><npc_response>" targets:<player>
```

### Uso con Comandos

```yaml
# Comando para hablar con Alvar
Alvar_Comando:
  type: command
  name: alvar
  usage: /alvar <mensaje>
  description: Habla con Alvar el Tabernero
  script:
    - if <context.args.size> == 0:
      - narrate "Debes decirle algo a Alvar."
      - stop

    - define message:<context.args.join[ ]>
    - define player_session_id:<player.flag[alvar_session_id]>

    - definemap data:
        mode: "chat"
        message: "<message>"
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: "<player_session_id>"

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>
    - flag player alvar_session_id:<response_data.data.sessionid>

    - narrate "<&a><&l>[Alvar]:<&r> <response_data.data.response>" targets:<player>
```

---

## 📝 Ejemplo 2: Resumen de Sesión

### Escenario
El jugador se despide de Alvar, y generamos un resumen de la conversación.

### Script Denizen

```yaml
Alvar_Despide:
  type: command
  name: alvar_despide
  description: Finaliza la conversación con Alvar y genera resumen
  script:
    - define session_id:<player.flag[alvar_session_id]>

    - if <session_id> == null:
      - narrate "No tienes una sesión activa con Alvar."
      - stop

    - definemap data:
        mode: "resumen_sesion"
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: "<session_id>"

    - narrate "<&7>Alvar asiente y empieza a barrer el suelo..."
    - wait 2s

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&7>[Sistema] Sesión resumida correctamente."
    - debug "Resumen: <response_data.data.summary>"

    # Limpiar la sesión del jugador
    - flag player alvar_session_id:!
```

---

## 🧠 Ejemplo 3: Memoria Global del NPC

### Escenario
Al final del día, queremos consolidar toda la memoria de Alvar.

### Script Denizen

```yaml
# Ejecutar esto periódicamente (por ejemplo, cada 24 horas de juego)
Alvar_Consolida_Memoria:
  type: world
  events:
    on time 06:00 in world@Esparcraft:

  - definemap data:
      mode: "resumen_npc"
      npcid: "NPC_ALVAR_TABERNERO"

  - narrate "<&7>[Sistema] Consolidando memoria de NPCs..."
  - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

  - define response_data:<response.data.parse_json>
  - debug "Memoria consolidada para Alvar"
```

---

## 🌍 Ejemplo 4: Generar Nuevo Lore

### Escenario
Ocurre un evento importante en el pueblo, y queremos añadirlo al lore.

### Script Denizen

```yaml
# Script para añadir un rumor al pueblo
Nuevo_Rumor_Meslajho:
  type: command
  name: rumor
  usage: /rumor <rumor>
  permission: admin
  script:
    - if <context.args.size> == 0:
      - narrate "Debes proporcionar un rumor."
      - stop

    - define rumor_text:<context.args.join[ ]>

    - definemap data:
        mode: "nuevo_lore"
        scope: "pueblo"
        targetId: "PUEBLO_MESLAJHO"
        loreType: "rumores"
        context: "<rumor_text>"

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&a>[Admin] Nuevo lore añadido al sistema:"
    - narrate "<&7><response_data.data.lore>"
```

---

## 🎯 Ejemplo 5: Sistema de Quests Dinámicos

### Escenario
Usar el Bridge para generar quests dinámicas.

### Script Denizen

```yaml
Generar_Quest:
  type: command
  name: quest
  description: Pide a Alvar por una misión
  script:
    - definemap data:
        mode: "chat"
        message: "¿Tienes algún trabajo para mí? Necesito algo que hacer."
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: ""

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&l>[Alvar]:<&r> <response_data.data.response>"
    - flag player alvar_session_id:<response_data.data.sessionid>

    # Procesar la respuesta para detectar si es una quest
    - if <response_data.data.response.contains["trabajo"]> || <response_data.data.response.contains["misión"]>:
      - flag player active_quest:"Alvar: <response_data.data.response.substring[1,50]>"

      - narrate "<&e>¡Has aceptado una misión!"
```

---

## 🎭 Ejemplo 6: Sistema de Reputación

### Escenario
Rastrear la relación del jugador con NPCs.

### Script Denizen

```yaml
# Define reputación del jugador
- define player_reputation:<player.flag[reputation_alvar]||0>

# Preparar mensaje con contexto de reputación
- define context_msg:"Reputación del jugador: <player_reputation> de 100. "
- define context_msg:"<context_msg>Jugador pregunta: "

- definemap data:
    mode: "chat"
    message: "<context_msg><context.args.join[ ]>"
    npcid: "NPC_ALVAR_TABERNERO"
    playersessionid: "<player.flag[alvar_session_id]>"

- ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

- define response_data:<response.data.parse_json>

# Narrar respuesta y actualizar reputación según interacción
- if <response_data.data.response.contains["agradecido"]>:
    - flag player reputation_alvar:+5
- else if <response_data.data.response.contains["desconfiado"]>:
    - flag player reputation_alvar:-2

- narrate "<&l>[Alvar (<player.flag[reputation_alvar]||0>)]:<&r> <response_data.data.response>"
```

---

## 🏪 Ejemplo 7: Sistema de Comercio con IA

### Escenario
Negociar precios con Alvar usando IA.

### Script Denizen

```yaml
Negociar_Precio:
  type: command
  name: negociar
  usage: /negociar <precio> <objeto>
  script:
    - if <context.args.size> < 2:
      - narrate "Uso: /negociar <precio> <objeto>"
      - stop

    - define precio:<context.args.get[0].as_int>
    - define objeto:<context.args.get[1].to_titlecase>

    - definemap data:
        mode: "chat"
        message: "Quiero comprar <objeto>. Ofrezco <precio> monedas. ¿Te parece bien?"
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: "<player.flag[alvar_session_id]>"

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&l>[Alvar]:<&r> <response_data.data.response>"

    # Lógica simple para aceptar/rechazar
    - if <response_data.data.response.contains["acepto"]> || <response_data.data.response.contains["trato"]>:
      - narrate "<&a>¡Trato aceptado! Pagas <precio> monedas por <objeto>."
      - money take quantity:<precio>
    - else if <response_data.data.response.contains["no"]> || <response_data.data.response.contains["poco"]>:
      - narrate "<&c>Trato rechazado."
```

---

## 📚 Ejemplo 8: Vista Previa de Prompts

### Escenario
Depurar prompts antes de enviarlos.

### Script Denizen

```yaml
Previsualizar_Prompt:
  type: command
  name: preview
  permission: admin
  script:
    - definemap data:
        mode: "chat"
        message: "Hola, ¿qué tal estás?"
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: ""

    - ~webget "http://localhost:3000/api/reroute?preview=true" data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&e>=== PREVIEW DEL PROMPT ==="
    - narrate "<&7>Tokens estimados: <response_data.data.estimatedTokens>"
    - narrate "<&7>Mensajes: <response_data.data.messages.size>"
    - debug "System Prompt: <response_data.data.systemPrompt>"
```

---

## 🔐 Ejemplo 9: Sistema de Condiciones Contextuales

### Escenario
Que el NPC reaccione diferente según la hora del día o clima.

### Script Denizen

```yaml
Saludo_Contextual:
  type: command
  name: saludar
  script:
    - define current_time:<server.current_time.simple_time>

    # Construir mensaje con contexto
    - define context_msg:"Es <current_time> y el jugador te saluda. "

    - definemap data:
        mode: "chat"
        message: "<context_msg>Hola."
        npcid: "NPC_ALVAR_TABERNERO"
        playersessionid: "<player.flag[alvar_session_id]>"

    - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

    - define response_data:<response.data.parse_json>

    - narrate "<&l>[Alvar]:<&r> <response_data.data.response>"
```

---

## 🎪 Ejemplo 10: Eventos Especiales

### Escenario
Eventos especiales que afectan el lore del mundo.

### Script Denizen

```yaml
# Evento que ocurre en el pueblo
Evento_Especial:
  type: world
  events:
    on player enters 150,64,200 to 170,70,220 in Meslajho:

  # Un terremoto afecta el pueblo
  - define event_desc:"Un terremoto sacude Meslajho, provocando caos en las calles."

  - narrate "<&c>¡La tierra tiembla violentamente!"
  - play sound ENTITY_GENERIC_EXPLODE at:<player.location>

  - definemap data:
      mode: "nuevo_lore"
      scope: "pueblo"
      targetId: "PUEBLO_MESLAJHO"
      loreType: "eventos_recientes"
      context: "<event_desc>"

  - ~webget http://localhost:3000/api/reroute data:<[data].to_json> headers:<[headers]> save:response

  - narrate "<&7>[Sistema] Lore actualizado tras el evento."
```

---

## 📌 Notas Importantes

1. **IDs de NPCs**: Deben coincidir exactamente con los IDs creados en el dashboard
2. **Session IDs**: Guárdalos en flags de jugador para mantener continuidad
3. **Manejo de Errores**: Siempre verifica que la respuesta sea exitosa antes de usarla
4. **Performance**: Evita hacer demasiadas peticiones simultáneas
5. **Preview**: Usa `?preview=true` para depurar prompts antes de producción

---

## 🛠️ Troubleshooting

### El NPC no responde

```yaml
# Verificar conexión con el Bridge
Test_Conexion:
  type: command
  name: test_bridge
  script:
    - ~webget http://localhost:3000/api/reroute headers:<[headers]> save:response

    - if <response.contains["ok"]>:
        - narrate "<&a>Conexión exitosa con el Bridge."
    - else:
        - narrate "<&c>Error de conexión con el Bridge."
```

### Verificar que el NPC existe

```yaml
# Usar el API para verificar NPCs
Verificar_NPC:
  type: command
  name: check_npc
  usage: /check_npc <id>
  script:
    - ~webget "http://localhost:3000/api/npcs/<context.args.get[0]>" headers:<[headers]> save:response

    - if <response.contains["success"]>:
        - define npc_data:<response.data.parse_json>
        - narrate "<&a>NPC encontrado: <npc_data.data.card.name>"
    - else:
        - narrate "<&c>NPC no encontrado: <context.args.get[0]>"
```

---

## 🎓 Consejos Avanzados

1. **Caching**: Guarda respuestas frecuentes en mapas para reducir peticiones
2. **Throttling**: Limita la frecuencia de peticiones por jugador
3. **Async**: Usa el sistema de async de Denizen para peticiones largas
4. **Fallbacks**: Ten respuestas predefinidas si el Bridge falla
5. **Logging**: Guarda un log de todas las interacciones para debugging

---

Este documento es parte del proyecto **Bridge IA - Gestor Narrativo** para la comunidad **Tirano Estudios** en el servidor **Esparcraft**.

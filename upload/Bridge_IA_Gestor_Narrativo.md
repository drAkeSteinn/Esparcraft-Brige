
# 🧠 Bridge IA — Gestor Narrativo para Juegos de Rol

## 📌 Propósito del Proyecto

Este proyecto es un **Bridge local** entre:

- 🧱 **Denizen (Minecraft)** mediante `webget`
- 🧠 **Text Generation WebUI (oobabooga)**
- 🎭 **Sistema de NPCs estilo SillyTavern**
- 🌍 **Gestión narrativa de mundos, pueblos y edificios**

Su función principal es:

> Construir, organizar, visualizar y enrutar prompts narrativos complejos hacia un modelo de lenguaje local.

❌ No usa base de datos  
✅ Todo se gestiona mediante archivos JSON  
✅ Totalmente local  
✅ Pensado para integración con IA narrativa persistente

---

## 🔗 Arquitectura General

```
Jugador
   ↓
Denizen (webget)
   ↓
Bridge Narrativo (Next.js)
   ↓
Text Generation WebUI (API OpenAI-compatible)
   ↓
Respuesta → Denizen → NPC
```

---

## ⚙️ Tecnologías

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- File-based JSON Storage
- Text Generation WebUI (`--api`)
- Denizen Script Engine

---

## 📁 Estructura del Proyecto

```
/data
  /worlds
  /pueblos
  /edificios
  /npcs
    /states
  /sessions
    /summaries

/src
  /app
    /api
      /reroute
  /lib
    fileManager.ts
    promptBuilder.ts
    triggerHandlers.ts
```

---

## 🌍 Sistema de Mundo

### Mundo

```json
{
  "id": "WORLD_001",
  "name": "Esparcraft",
  "lore": {
    "estado_mundo": "El mundo se encuentra bajo el Decreto del Dolor",
    "rumores": []
  }
}
```

---

### Pueblo

```json
{
  "id": "PUEBLO_001",
  "worldId": "WORLD_001",
  "name": "Meslajho",
  "lore": {
    "estado_pueblo": "Tensión constante",
    "rumores": []
  }
}
```

---

### Edificio

```json
{
  "id": "EDIF_001",
  "worldId": "WORLD_001",
  "puebloId": "PUEBLO_001",
  "name": "Taberna de Alvar",
  "lore": "Lugar de reunión",
  "eventos_recientes": [],
  "area": {
    "start": { "x": 10, "y": 64, "z": 20 },
    "end": { "x": 20, "y": 70, "z": 30 }
  }
}
```

---

## 🎭 NPCs (SillyTavern Compatible)

Cada NPC utiliza el formato **CARD JSON de SillyTavern**.

Además se añade:

```json
{
  "id": "NPC_001",
  "location": {
    "scope": "edificio",
    "worldId": "WORLD_001",
    "puebloId": "PUEBLO_001",
    "edificioId": "EDIF_001"
  },
  "card": {
    "...": "estructura SillyTavern"
  }
}
```

- El ID puede ser automático o manual.
- El JSON puede importarse/exportarse.
- Las secciones se editan visualmente.

---

## 🗺️ Mapa 2D

- Representación lógica del mundo.
- Vista por mundo → pueblos → edificios.
- Zoom, pan y tooltips.
- Permite visualizar distribución espacial.

No es gráfico final, es **mapa cognitivo**.

---

## 🔁 Sistema de Triggers

Todos los triggers se reciben mediante un solo endpoint:

```
POST /api/reroute
```

### Payload base:

```json
{
  "mode": "chat | resumen_sesion | resumen_npc | nuevo_lore",
  "...": "payload específico"
}
```

---

## 🧩 Trigger: Chat

### Denizen

```yaml
- definemap data:
    mode: "chat"
    message: "hola"
    npcid: "NPC_001"
    playersessionid: ""

- ~webget http://localhost:3001/api/reroute data:<[data].to_json> headers:<[headers]> save:response
```

- Si `playersessionid` está vacío → nueva sesión.
- Si existe → continúa historial.

El Bridge guarda la sesión localmente.

---

## 🧾 Trigger: Resumen de Sesión

```yaml
- definemap data:
    mode: "resumen_sesion"
    npcid: "NPC_001"
    playersessionid: "SESSION_123"

- ~webget http://localhost:3001/api/reroute data:<[data].to_json> headers:<[headers]> save:response
```

Genera resumen y lo guarda en:

```
/data/sessions/summaries/
```

---

## 🧠 Trigger: Resumen Global del NPC

```yaml
- definemap data:
    mode: "resumen_npc"
    npcid: "NPC_001"
```

Construye memoria consolidada del NPC.

Se guarda en:

```
/data/npcs/states/npc_<id>_memory.json
```

---

## 🌒 Trigger: Nuevo Lore

```yaml
- definemap data:
    mode: "nuevo_lore"
    scope: "pueblo"
    targetId: "PUEBLO_001"
    loreType: "rumores"
    context: "Han desaparecido comerciantes"
```

Actualiza el lore narrativo del mundo.

---

## 🧪 Visualizador de Prompt

Cada trigger debe mostrar:

- System Prompt final
- Messages enviados
- Contexto inyectado
- Historial incluido
- Estimación de tokens
- Request final al LLM

Esto permite depurar antes de gastar inferencia.

---

## 🔌 Text Generation WebUI

Debe ejecutarse con:

```bash
python server.py --api
```

Endpoint usado:

```
http://127.0.0.1:5000/v1/chat/completions
```

Formato OpenAI compatible.

---

## 🚫 No incluido (a propósito)

- ❌ Base de datos
- ❌ Autenticación
- ❌ Embeddings
- ❌ WebSockets

Este sistema es el **cerebro narrativo**, no el ejecutor final.

---

## 🎯 Filosofía

> La IA no debe improvisar.
>  
> Debe recordar.
>  
> Debe vivir dentro de un mundo.

Este proyecto existe para eso.

---

## 🔮 Futuro

- Integración Flowise
- Memoria vectorial
- NPCs con personalidad evolutiva
- Sincronización mundo ↔ jugadores
- Sistema cognitivo persistente

---

🩸 Proyecto diseñado para mundos vivos.

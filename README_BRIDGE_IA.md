# 🧠 Bridge IA - Gestor Narrativo

Sistema de gestión narrativa para el servidor **Esparcraft** de la comunidad **Tirano Estudios**.

Este proyecto es un puente local entre Denizen (Minecraft) y Text Generation WebUI, permitiendo NPCs con IA persistente y gestión narrativa de mundos.

---

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración de Text Generation WebUI](#configuración-de-text-generation-webui)
- [Uso con Denizen](#uso-con-denizen)
- [API Endpoints](#api-endpoints)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Variables de Entorno](#variables-de-entorno)

---

## ✨ Características

- 🌍 **Gestión de Mundos**: Crea y gestiona mundos narrativos con lore y rumores
- 🏘️ **Sistema de Pueblos**: Administra pueblos con su propio contexto narrativo
- 🏛️ **Edificios y Estructuras**: Gestiona ubicaciones específicas dentro de los pueblos
- 🎭 **NPCs con SillyTavern**: Completamente compatible con formato de SillyTavern
- 💬 **Sistema de Chat**: Chat interactivo con NPCs usando IA
- 📝 **Resúmenes de Sesión**: Generación automática de resúmenes narrativos
- 🧠 **Memoria de NPCs**: Sistema de memoria persistente para cada NPC
- 🗺️ **Mapa 2D Cognitivo**: Visualización espacial interactiva del mundo
- 🔍 **Visualizador de Prompts**: Vista previa de prompts antes de enviar al LLM
- 📊 **Gestión de Sesiones**: Historial completo de conversaciones

---

## 🏗️ Arquitectura

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

## 📦 Requisitos Previos

- **Node.js** 20+ (usando Bun como runtime)
- **Python** 3.10+
- **Text Generation WebUI** (oobabooga)
- **Minecraft Server** con plugin Denizen

---

## 🚀 Instalación

1. **Clonar el repositorio** (si aplica):
```bash
git clone <repositorio>
cd my-project
```

2. **Instalar dependencias**:
```bash
bun install
```

3. **Crear estructura de datos** (ya creada):
```bash
mkdir -p data/worlds data/pueblos data/edificios data/npcs/states data/sessions/summaries
```

4. **Configurar variables de entorno** (ver sección [Variables de Entorno](#variables-de-entorno))

5. **Iniciar Text Generation WebUI** (ver sección [Configuración de Text Generation WebUI](#configuración-de-text-generation-webui))

6. **Iniciar el servidor**:
```bash
bun run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## ⚙️ Configuración de Text Generation WebUI

### Instalación

1. Clonar Text Generation WebUI:
```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

### Ejecución con API

Ejecutar con la API OpenAI-compatible habilitada:

```bash
python server.py --api --listen --extensions api
```

Por defecto, la API estará disponible en `http://127.0.0.1:5000`

### Configuración del Modelo

Carga el modelo que deseas usar en Text Generation WebUI. Asegúrate de que sea compatible con chat (LLaMA, Mistral, etc.).

---

## 🔌 Uso con Denizen

### Ejemplo de Trigger: Chat

```yaml
- definemap data:
    mode: "chat"
    message: "hola"
    npcid: "NPC_001"
    playersessionid: ""

- ~webget http://localhost:3000/api/reroute data:<[data].to_json> save:response

- narrate "<[response.data.response]>"
```

### Ejemplo de Trigger: Resumen de Sesión

```yaml
- definemap data:
    mode: "resumen_sesion"
    npcid: "NPC_001"
    playersessionid: "SESSION_123"

- ~webget http://localhost:3000/api/reroute data:<[data].to_json> save:response
```

### Ejemplo de Trigger: Resumen de NPC

```yaml
- definemap data:
    mode: "resumen_npc"
    npcid: "NPC_001"

- ~webget http://localhost:3000/api/reroute data:<[data].to_json> save:response
```

### Ejemplo de Trigger: Nuevo Lore

```yaml
- definemap data:
    mode: "nuevo_lore"
    scope: "pueblo"
    targetId: "PUEBLO_001"
    loreType: "rumores"
    context: "Han desaparecido comerciantes"

- ~webget http://localhost:3000/api/reroute data:<[data].to_json> save:response
```

---

## 🔌 API Endpoints

### Endpoint Principal: `/api/reroute`

#### POST
**Descripción**: Ejecuta un trigger del Bridge

**Query Params**:
- `preview` (opcional): Si es `true`, devuelve el preview del prompt sin llamar al LLM

**Body** (según modo):

**Modo `chat`**:
```json
{
  "mode": "chat",
  "message": "hola",
  "npcid": "NPC_001",
  "playersessionid": "SESSION_123"
}
```

**Modo `resumen_sesion`**:
```json
{
  "mode": "resumen_sesion",
  "npcid": "NPC_001",
  "playersessionid": "SESSION_123"
}
```

**Modo `resumen_npc`**:
```json
{
  "mode": "resumen_npc",
  "npcid": "NPC_001"
}
```

**Modo `nuevo_lore`**:
```json
{
  "mode": "nuevo_lore",
  "scope": "pueblo",
  "targetId": "PUEBLO_001",
  "loreType": "rumores",
  "context": "Han desaparecido comerciantes"
}
```

#### GET
**Descripción**: Health check del servicio

**Respuesta**:
```json
{
  "status": "ok",
  "service": "Bridge IA - Gestor Narrativo",
  "version": "1.0.0",
  "modes": ["chat", "resumen_sesion", "resumen_npc", "nuevo_lore"]
}
```

### CRUD Endpoints

#### Mundos
- `GET /api/worlds` - Listar todos los mundos
- `POST /api/worlds` - Crear mundo
- `GET /api/worlds/[id]` - Obtener mundo
- `PUT /api/worlds/[id]` - Actualizar mundo
- `DELETE /api/worlds/[id]` - Eliminar mundo

#### Pueblos
- `GET /api/pueblos?worldId=XXX` - Listar pueblos (opcionalmente filtrar por mundo)
- `POST /api/pueblos` - Crear pueblo
- `GET /api/pueblos/[id]` - Obtener pueblo
- `PUT /api/pueblos/[id]` - Actualizar pueblo
- `DELETE /api/pueblos/[id]` - Eliminar pueblo

#### Edificios
- `GET /api/edificios?worldId=XXX&puebloId=YYY` - Listar edificios (con filtros opcionales)
- `POST /api/edificios` - Crear edificio
- `GET /api/edificios/[id]` - Obtener edificio
- `PUT /api/edificios/[id]` - Actualizar edificio
- `DELETE /api/edificios/[id]` - Eliminar edificio

#### NPCs
- `GET /api/npcs?worldId=XXX&puebloId=YYY&edificioId=ZZZ` - Listar NPCs (con filtros opcionales)
- `POST /api/npcs` - Crear NPC
- `GET /api/npcs/[id]` - Obtener NPC
- `PUT /api/npcs/[id]` - Actualizar NPC
- `DELETE /api/npcs/[id]` - Eliminar NPC

#### Sesiones
- `GET /api/sessions?npcId=XXX` - Listar sesiones (opcionalmente filtrar por NPC)
- `POST /api/sessions` - Crear sesión
- `GET /api/sessions/[id]` - Obtener sesión
- `PUT /api/sessions/[id]` - Actualizar sesión
- `DELETE /api/sessions/[id]` - Eliminar sesión

---

## 📁 Estructura del Proyecto

```
/data
  /worlds          # Archivos JSON de mundos
  /pueblos         # Archivos JSON de pueblos
  /edificios       # Archivos JSON de edificios
  /npcs
    /states        # Estados de memoria de NPCs
  /sessions
    /summaries    # Resúmenes de sesiones

/src
  /app
    /api
      /reroute           # Endpoint principal para Denizen
      /worlds            # CRUD de mundos
      /pueblos           # CRUD de pueblos
      /edificios         # CRUD de edificios
      /npcs              # CRUD de NPCs
      /sessions          # CRUD de sesiones
    /page.tsx            # Dashboard principal
  /components
    /dashboard
      WorldsTab.tsx      # Tab de mundos
      PueblosTab.tsx     # Tab de pueblos
      EdificiosTab.tsx   # Tab de edificios
      NpcsTab.tsx        # Tab de NPCs
      MapTab.tsx         # Mapa 2D cognitivo
      SessionsTab.tsx    # Gestión de sesiones
    /ui                  # Componentes shadcn/ui
  /hooks
    use-toast.ts        # Hook para notificaciones
  /lib
    types.ts            # Definiciones TypeScript
    fileManager.ts      # Gestión de archivos JSON
    promptBuilder.ts    # Construcción de prompts
    triggerHandlers.ts  # Handlers de triggers
```

---

## 🔧 Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Text Generation WebUI Configuration
LLM_API_URL=http://127.0.0.1:5000/v1/chat/completions
LLM_MODEL=local-model
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000
```

### Explicación

- **LLM_API_URL**: URL de la API de Text Generation WebUI
- **LLM_MODEL**: Nombre del modelo a usar (debe coincidir con el cargado en Text Generation WebUI)
- **LLM_TEMPERATURE**: Temperatura de generación (0-1), mayor = más creativo
- **LLM_MAX_TOKENS**: Máximo de tokens en la respuesta

---

## 🎯 Modos de Trigger

### 1. Chat
Interacción directa con un NPC. Crea o continúa una sesión de chat.

### 2. Resumen de Sesión
Genera un resumen narrativo de una sesión de chat.

### 3. Resumen de NPC
Consolida toda la memoria de un NPC en un resumen global.

### 4. Nuevo Lore
Añade nuevo lore narrativo al mundo o a un pueblo.

---

## 💡 Tips y Mejores Prácticas

1. **Usa el preview**: Antes de gastar inferencia, usa `?preview=true` para ver el prompt
2. **Resúmenes periódicos**: Genera resúmenes de sesión regularmente para mantener el contexto
3. **Memoria de NPC**: Ejecuta `resumen_npc` después de varias sesiones para consolidar la memoria
4. **Lore consistente**: Usa el modo `nuevo_lore` para mantener el mundo coherente
5. **IDs descriptivos**: Usa IDs como `WORLD_ESPARCRAFT`, `PUEBLO_MESLAJHO`, `NPC_TABERNERO`

---

## 📝 Notas

- El sistema NO usa base de datos, todo se gestiona mediante archivos JSON
- Totalmente local, no requiere servicios externos
- Compatible con formato de tarjetas SillyTavern
- Diseñado para integración con IA narrativa persistente

---

## 🩸 Comunidad

- **Proyecto**: Bridge IA - Gestor Narrativo
- **Comunidad**: Tirano Estudios
- **Servidor**: Esparcraft

---

## 📄 Licencia

Este proyecto es parte de la comunidad Tirano Estudios para el servidor Esparcraft.

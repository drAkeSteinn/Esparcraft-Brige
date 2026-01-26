# 📚 Grimorio - Sistema de Variables y Plantillas

El Grimorio es el sistema centralizado del proyecto para gestionar variables y plantillas reutilizables que permiten la expansión dinámica de contenido con variables del contexto.

---

## 🎯 Visión General

El Grimorio permite:

1. **Documentar variables primarias** del sistema (solo informativas)
2. **Crear plantillas reutilizables** que pueden contener variables
3. **Aplicar plantillas** con resolución automática de variables
4. **Cache inteligente** para mejorar el rendimiento
5. **Estadísticas detalladas** de uso y performance

---

## 📖 Tipos de Cards

### 1. Variables Primarias (`tipo: "variable"`)

Las variables primarias son **informativas (read-only)** y sirven como documentación de las variables disponibles en el sistema.

#### Características:
- **Solo informativas**: No se edita el contenido
- **Read-only**: El campo `plantilla` puede estar vacío
- **Resolución directa**: Se extraen del contexto sin expansión
- **Categoría fija**: Siempre están en la categoría `"variables"`

#### Ejemplos:
```javascript
// Variable primaria
{
  id: "VAR_xxx",
  key: "jugador.nombre",
  nombre: "Nombre del Jugador",
  plantilla: "", // No usado para variables primarias
  categoria: "variables",
  tipo: "variable",
  descripcion: "El nombre del jugador actual"
}

// Otras variables primarias
- npc.name → Nombre del NPC actual
- mundo.estado → Estado actual del mundo
- pueblo.name → Nombre del pueblo actual
- jugador.nivel → Nivel del jugador
```

#### Cómo usar:
```
En una plantilla:
"Hola {{jugador.nombre}}, bienvenido a {{pueblo.name}}!"

Resolución:
"Hola drAke, bienvenido a Valle Dorado!"
```

---

### 2. Plantillas (`tipo: "plantilla"`)

Las plantillas son **bloques de texto reutilizables** que pueden contener variables primarias anidadas.

#### Características:
- **Reutilizables**: Pueden usarse múltiples veces
- **Contienen variables**: Pueden incluir variables primarias
- **Sin anidamiento**: NO pueden contener otras plantillas (previene ciclos)
- **Expansión dinámica**: Se expanden y reemplazan las variables

#### Ejemplos:
```javascript
// Plantilla de datos del jugador
{
  id: "PLANT_xxx",
  key: "user_data",
  nombre: "Datos del Jugador",
  plantilla: `DATOS DEL AVENTURERO
Nombre: {{jugador.nombre}}
Raza: {{jugador.raza}}
Nivel: {{jugador.nivel}}
Salud: {{jugador.salud_actual}}
Almakos: {{jugador.almakos}}
Deuda: {{jugador.deuda}}
Piedras del Alma: {{jugador.piedras_del_alma}}`,
  categoria: "jugador",
  tipo: "plantilla",
  descripcion: "Formato estándar para mostrar información del jugador"
}
```

#### Cómo usar:
```
En un prompt:
"{{user_data}}"

Resolución:
"DATOS DEL AVENTURERO
Nombre: drAke
Raza: Humano
Nivel: 10
Salud: 100%
Almakos: 1000
Deuda: 100
Piedras del Alma: 5"
```

---

## 🔄 Flujo de Resolución de Variables

### Diagrama de Flujo

```
┌─────────────────────────────────────────┐
│  Texto con: {{variable}}           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Paso 1: Identificar Tipo          │
│  - ¿Es variable primaria?         │
│  - ¿Es plantilla del Grimorio?    │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────┐
│ Primaria      │   │ Plantilla    │
└───────┬───────┘   └──────┬───────┘
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────┐
│ Extraer del   │   │ Buscar en   │
│ contexto      │   │ Grimorio    │
└───────┬───────┘   └──────┬───────┘
        │                   │
        │             ┌─────┴─────┐
        │             │             │
        │             ▼             ▼
        │    ┌──────────┐  ┌──────────┐
        │    │ Existe?  │  │ No existe│
        │    └─────┬────┘  └─────┬────┘
        │          │               │
        │     Sí   │  No          │
        │    ┌─────┴────┐        │
        │    ▼           ▼        │
        │ ┌──────┐  ┌──────┐  │
        │ │Expand│  │Retorn│  │
        │ │var   │  │''    │  │
        │ └───┬──┘  └───┬──┘  │
        │     │          │      │
        │     ▼          │      │
        │  ┌──────────┐  │      │
        │  │Anidados? │  │      │
        │  └────┬─────┘  │      │
        │   Sí  │   No    │      │
        │  ┌─────┴────┐  │      │
        │  ▼           ▼  │      │
        │┌──────┐  ┌────────┐ │
        ││Retorn│  │Retorn │ │
        ││''    │  │resultado│ │
        │└───┬──┘  └───┬────┘ │
        └────┴──────────┴──────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Texto Final  │
         └─────────────────┘
```

### Algoritmo de Resolución

```javascript
function resolveGrimorioVariable(variableName, context, grimorioCards) {
  // 1. Identificar tipo
  const variableType = identifyVariableType(variableName);

  // 2a. Si es primaria: extraer del contexto
  if (variableType === 'primaria') {
    return replaceVariables(`{{${variableName}}}`, context);
  }

  // 2b. Si es plantilla: buscar y expandir
  if (variableType === 'plantilla') {
    const template = grimorioCards.find(c => c.key === variableName);

    // Plantilla no existe → retornar vacío
    if (!template) return '';

    // No es tipo plantilla → retornar vacío
    if (template.tipo !== 'plantilla') return '';

    // Tiene plantillas anidadas → retornar vacío (prevenir ciclos)
    const nested = extractTemplateVariables(template.plantilla);
    if (nested.length > 0) return '';

    // Expandir y reemplazar variables primarias
    const expanded = template.plantilla;
    return replaceVariables(expanded, context);
  }

  // 3. Variable desconocida → retornar vacío
  return '';
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Variable Primaria Simple

```javascript
// Contexto
const context = {
  jugador: { nombre: 'Aldric', raza: 'Humano', nivel: '15' },
  mundo: { name: 'Esparcraft' }
};

// Uso en texto
"Hola, soy {{jugador.nombre}}, un {{jugador.raza}} de nivel {{jugador.nivel}}."

// Resultado
"Hola, soy Aldric, un Humano de nivel 15."
```

### Ejemplo 2: Plantilla con Variables Anidadas

```javascript
// Plantilla en Grimorio
{
  key: "user_profile",
  nombre: "Perfil de Usuario",
  plantilla: `PERFIL DE JUGADOR
━━━━━━━━━━━━━━
Nombre: {{jugador.nombre}}
Raza: {{jugador.raza}}
Nivel: {{jugador.nivel}}
Salud: {{jugador.salud_actual}}
Reputación: {{jugador.reputacion}}
━━━━━━━━━━━━━━`,
  tipo: "plantilla",
  categoria: "jugador"
}

// Contexto
const context = {
  jugador: {
    nombre: 'Theron',
    raza: 'Elfo',
    nivel: '20',
    salud_actual: '85%',
    reputacion: 'Héroe'
  }
};

// Uso
"{{user_profile}}"

// Resultado
"PERFIL DE JUGADOR
━━━━━━━━━━━━━━
Nombre: Theron
Raza: Elfo
Nivel: 20
Salud: 85%
Reputación: Héroe
━━━━━━━━━━━━━━"
```

### Ejemplo 3: Plantilla con Ubicación

```javascript
// Plantilla en Grimorio
{
  key: "location_info",
  nombre: "Información de Ubicación",
  plantilla: `Te encuentras en {{edificio.name}}, en el pueblo de {{pueblo.name}}, en el mundo de {{world.name}}.`,
  tipo: "plantilla",
  categoria: "ubicacion"
}

// Contexto
const context = {
  mundo: { name: 'Esparcraft' },
  pueblo: { name: 'Valle Dorado' },
  edificio: { name: 'Herrería del Maestro' }
};

// Uso
"{{location_info}} El clima es {{jugador.clima}}."

// Resultado
"Te encuentras en Herrería del Maestro, en el pueblo de Valle Dorado,
en el mundo de Esparcraft. El clima es soleado."
```

### Ejemplo 4: Plantilla para Diálogo de NPC

```javascript
// Plantilla en Grimorio
{
  key: "npc_greeting",
  nombre: "Saludo de NPC",
  plantilla: `*{{npc.name}} se gira hacia ti y sonríe*

"Hola, {{jugador.nombre}}. Bienvenido a mi {{edificio.name}}."
*Te mira con curiosidad*

"¿En qué puedo ayudarte hoy, viajero?"`,
  tipo: "plantilla",
  categoria: "npc"
}

// Contexto
const context = {
  npc: { card: { data: { name: 'Gandalf' } } },
  jugador: { nombre: 'Frodo' },
  edificio: { name: 'Torre de Vigilancia' }
};

// Uso
"{{npc_greeting}}"

// Resultado
"*Gandalf se gira hacia ti y sonríe*

"Hola, Frodo. Bienvenido a mi Torre de Vigilancia."
*Te mira con curiosidad*

"¿En qué puedo ayudarte hoy, viajero?""
```

---

## ✅ Casos Especiales

### Caso 1: Plantilla Inexistente

```
Entrada: "{{plantilla_fantasma}}"
Resultado: "" (string vacío según regla 2)
```

### Caso 2: Variable Primaria No Definida

```
Contexto: { jugador: { nombre: 'Aldric' } }
Entrada: "{{jugador.edad}}" // Variable no existe en el contexto
Resultado: "" (variable no resuelta)
```

### Caso 3: Plantilla con Plantilla Anidada (Error)

```
Plantilla A contiene: "Usa {{plantilla_b}}"
Plantilla B contiene: "Vuelve a {{plantilla_a}}"

Resultado de aplicar {{plantilla_a}}: "" (prevenido ciclo)
```

### Caso 4: Plantilla con Variables Primarias No Definidas

```
Plantilla: "Hola {{jugador.nombre}}, tienes {{jugador.oro}} almakos"
Contexto: { jugador: { nombre: 'Aldric' } } // oro no definido

Resultado:
"Hola Aldric, tienes  almakos"
```

---

## 🎓 Guía de Buenas Prácticas

### 1. Nombres de Variables Primarias

**✅ Bueno:**
```javascript
jugador.nombre
npc.descripcion
mundo.estado
pueblo.name
```

**❌ Malo:**
```javascript
nombreDelJugador     // Usa camelCase
nombre_del_jugador    // Usa prefijo innecesario
var_jugador_nombre    // Usa prefijo 'var_'
```

### 2. Nombres de Plantillas

**✅ Bueno:**
```javascript
user_profile        // Descriptivo, snake_case
location_info       // Claro y conciso
npc_greeting        // Incluye el tipo de contenido
```

**❌ Malo:**
```javascript
tpl1              // No descriptivo
plantilla_usuario  // Usa prefijo innecesario
UserProfile        // Usa camelCase
```

### 3. Categorías

Usa las categorías apropiadas:

| Categoría | Para qué usar | Ejemplo |
|-----------|---------------|-----------|
| `general` | Plantillas genéricas | greeting, farewell |
| `jugador` | Plantillas de datos del jugador | user_profile, user_inventory |
| `npc` | Plantillas relacionadas con NPCs | npc_greeting, npc_dialogue |
| `ubicacion` | Plantillas de ubicación | location_info, building_description |
| `mundo` | Plantillas del mundo | world_lore, world_events |
| `variables` | Variables primarias (read-only) | jugador.nombre, npc.name |

### 4. Evitar Anidamiento de Plantillas

**✅ Correcto:**
```
Plantilla: "Hola {{jugador.nombre}}, bienvenido a {{pueblo.name}}!"
```

**❌ Incorrecto:**
```
Plantilla A: "Bienvenido: {{plantilla_b}}"
Plantilla B: "Hola {{plantilla_a}}"
```

Esto crea un ciclo y previene la resolución.

### 5. Usar Validaciones

Antes de guardar una plantilla, valida que:

1. ✅ No contenga otras plantillas (solo variables primarias)
2. ✅ Las variables primarias usadas existan en el glosario
3. ✅ El formato del key sea correcto según el tipo
4. ✅ La descripción sea clara y útil

### 6. Performance

- ✅ Usa el cache cuando sea posible (`useCache: true`)
- ✅ Invalida el cache solo cuando sea necesario (al editar/eliminar)
- ✅ Monitorea las estadísticas para identificar plantillas lentas

---

## 🔌 Referencia de APIs

### Endpoints del Grimorio

#### GET /api/grimorio
Lista todas las cards del Grimorio.

**Parámetros de consulta:**
- `categoria`: Filtrar por categoría
- `tipo`: Filtrar por tipo (`variable` | `plantilla`)
- `search`: Buscar por nombre, key o texto

**Response:**
```json
{
  "success": true,
  "data": {
    "cards": [...],
    "total": 10
  }
}
```

#### POST /api/grimorio
Crea una nueva card en el Grimorio.

**Request:**
```json
{
  "key": "user_profile",
  "nombre": "Perfil de Usuario",
  "plantilla": "Nombre: {{jugador.nombre}}...",
  "categoria": "jugador",
  "tipo": "plantilla",
  "descripcion": "Descripción opcional"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* card creada */ },
  "message": "Card creada correctamente",
  "validations": {
    "variablesUsed": ["jugador.nombre"],
    "warnings": []
  }
}
```

#### PUT /api/grimorio/[id]
Actualiza una card existente.

**Request:**
```json
{
  "nombre": "Nuevo nombre",
  "plantilla": "Nueva plantilla",
  "descripcion": "Nueva descripción"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* card actualizada */ },
  "message": "Card actualizada correctamente"
}
```

#### DELETE /api/grimorio/[id]
Elimina una card del Grimorio.

**Response:**
```json
{
  "success": true,
  "message": "Card eliminada correctamente"
}
```

#### POST /api/grimorio/apply/[id]
Aplica una plantilla con un contexto específico.

**Request:**
```json
{
  "context": {
    "jugador": { "nombre": "Aldric" },
    "npc": { ... },
    "useCache": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": "...texto resuelto...",
    "cardId": "...",
    "cardType": "plantilla",
    "fromCache": false,
    "stats": {
      "resolved": 3,
      "emptyReturned": 0,
      "errors": 0,
      "executionTime": 12
    }
  },
  "message": "Aplicada correctamente"
}
```

### Endpoints de Cache

#### GET /api/grimorio/cache
Obtiene estadísticas del cache.

**Parámetros de consulta:**
- `action=stats`: Estadísticas detalladas
- `action=clean`: Limpiar entradas expiradas
- `action=clear`: Limpiar todo el cache

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": 15,
    "totalSize": 245760,
    "usagePercent": 4.7,
    "hits": 120,
    "misses": 45,
    "hitRate": 0.73,
    "topEntries": [...]
  }
}
```

#### DELETE /api/grimorio/cache
Limpia todo el cache.

### Endpoints de Estadísticas

#### GET /api/grimorio/stats
Obtiene estadísticas de uso del Grimorio.

**Parámetros de consulta:**
- `action=report`: Reporte detallado
- `action=logs`: Últimos logs
- `action=logs-by-type&type=X`: Logs por tipo
- `action=errors`: Logs de errores
- `action=top-variables`: Variables más usadas
- `limit`: Número máximo de resultados (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalResolutions": 543,
    "byType": {
      "primaria": 312,
      "plantilla": 210,
      "desconocida": 21
    },
    "errorsByType": {
      "primaria": 5,
      "plantilla": 12,
      "desconocida": 0
    },
    "cache": {
      "hits": 345,
      "misses": 198,
      "hitRate": 0.64
    },
    "performance": {
      "avgExecutionTime": 8.5,
      "maxExecutionTime": 45.0,
      "minExecutionTime": 1.2,
      "totalExecutionTime": 4615.5
    }
  }
}
```

#### DELETE /api/grimorio/stats
Reinicia todas las estadísticas.

---

## 🧪 Testing Manual

### Tests de Variables Primarias

```bash
# Test 1: Variable existente
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "jugador": { "nombre": "Test" } }
  }'
# Esperado: "Test"

# Test 2: Variable inexistente
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "jugador": {} }
  }'
# Esperado: "" (vacío)
```

### Tests de Plantillas

```bash
# Test 1: Plantilla simple
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "jugador": { "nombre": "Test" } }
  }'
# Esperado: Plantilla resuelta con {{jugador.nombre}} reemplazado

# Test 2: Plantilla con múltiples variables
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "jugador": { "nombre": "A", "raza": "B" },
      "mundo": { "name": "C" }
    }
  }'
# Esperado: Todas las variables reemplazadas
```

### Tests de Casos Extremos

```bash
# Test 1: Plantilla anidada (debe retornar vacío)
# Crear plantilla A con {{plantilla_b}}
# Crear plantilla B con {{plantilla_a}}
# Aplicar plantilla A
# Esperado: "" (vacío, prevenido ciclo)

# Test 2: Plantilla inexistente
curl -X POST /api/grimorio/apply/nonexistent-id \
  -H "Content-Type: application/json" \
  -d '{ "context": {} }'
# Esperado: 404 Not Found

# Test 3: Contexto vacío
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{ "context": {} }'
# Esperado: Plantilla con variables vacías
```

### Tests de Rendimiento

```bash
# Test 1: Sin cache
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": {...},
    "useCache": false
  }'
# Medir tiempo de ejecución

# Test 2: Con cache (segunda llamada)
curl -X POST /api/grimorio/apply/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "context": {...},
    "useCache": true
  }'
# Esperado: fromCache: true, tiempo menor

# Test 3: Estadísticas
curl /api/grimorio/stats?action=top-variables&limit=10
# Esperado: Lista de variables más usadas
```

---

## 📊 Monitoreo y Debugging

### Logs de Consola

El sistema genera logs detallados:

```
[Grimorio] Card "Datos del Jugador" (user_data) aplicada (tipo: plantilla)
[Grimorio] Cache: MISS
[Grimorio] Stats: 3 resueltas, 0 vacías, 0 errores, 12ms
[Grimorio Stats] Variable: jugador.nombre | Tipo: primaria | Tiempo: 2ms | Cache: MISS | Success: ✓
[Grimorio Stats] Variable: jugador.raza | Tipo: primaria | Tiempo: 1ms | Cache: MISS | Success: ✓
[Grimorio Stats] Variable: player_profile | Tipo: plantilla | Tiempo: 9ms | Cache: MISS | Success: ✓
```

### Estadísticas en Tiempo Real

Accede a las estadísticas del Grimorio:

```bash
# Estadísticas generales
curl /api/grimorio/stats

# Reporte detallado
curl /api/grimorio/stats?action=report

# Variables más usadas
curl /api/grimorio/stats?action=top-variables&limit=10

# Logs recientes
curl /api/grimorio/stats?action=logs&limit=20

# Logs de errores
curl /api/grimorio/stats?action=errors&limit=10
```

---

## 🚀 Funcionalidades Futuras

- [ ] Autocompletado de variables al escribir
- [ ] Visualizador de dependencias tipo árbol
- [ ] Importar/Exportar sets de plantillas
- [ ] Sistema de versiones de plantillas
- [ ] Editor visual con formato
- [ ] Plantillas predefinidas del sistema
- [ ] Ranking de plantillas más usadas

---

## 📚 Documentación Relacionada

- [SISTEMA_VARIABLES_README.md](./SISTEMA_VARIABLES_README.md) - Sistema completo de variables
- [PLAN_MEJORAS_GRIMORIO.md](./PLAN_MEJORAS_GRIMORIO.md) - Plan de implementación
- [worklog.md](./worklog.md) - Historial de cambios

---

**Última actualización:** 27 de enero de 2025
**Versión:** 2.0
**Estado:** ✅ Completado (Fases 1, 2, 3, 4)

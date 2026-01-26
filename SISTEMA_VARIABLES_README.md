# Sistema de Gestión de Variables - Esparcraft Bridge

Este documento describe el sistema completo de gestión de variables implementado para el Grimorio de Esparcraft Bridge.

## 📋 Índice

1. [Glosario Centralizado](#1-glosario-centralizado-de-variables)
2. [Validación de Variables](#2-helper-de-validación)
3. [Plantillas Personalizadas](#3-soporte-para-plantillas-personalizadas)
4. [Cache Inteligente](#4-cache-inteligente)
5. [API Endpoints](#5-api-endpoints)
6. [Ejemplos de Uso](#6-ejemplos-de-uso)

---

## 1. Glosario Centralizado de Variables

El glosario centraliza todas las variables disponibles en el sistema, facilitando su documentación y uso.

### Archivo: `src/lib/VARIABLE_GLOSSARY.ts`

### Categorías de Variables

| Categoría | Descripción | Ejemplos |
|-----------|-------------|-----------|
| **player** | Datos del jugador | `{{jugador.nombre}}`, `{{jugador.raza}}`, `{{jugador.nivel}}` |
| **npc** | Datos del NPC | `{{npc.name}}`, `{{npc.description}}`, `{{npc.personality}}` |
| **session** | Datos de la sesión | `{{npc.historial}}`, `{{chatHistory}}` |
| **world** | Datos del mundo | `{{mundo.name}}`, `{{mundo.estado}}`, `{{mundo.rumores}}` |
| **pueblo** | Datos del pueblo | `{{pueblo.name}}`, `{{pueblo.estado}}`, `{{pueblo.rumores}}` |
| **edificio** | Datos del edificio | `{{edificio.name}}`, `{{edificio.eventos}}`, `{{edificio.poislist}}` |
| **template** | Variables de plantilla | `{{templateUser}}`, `{{userMessage}}`, `{{lastSummary}}` |
| **meta** | Variables meta | `{{lastSummary}}`, `{{ultimo_resumen}}` |

### Funciones Principales

```typescript
// Obtener definición de una variable
getVariableDefinition('jugador.nombre')

// Obtener variables por categoría
getVariablesByCategory('player')

// Extraer variables de un texto
extractVariablesFromText('Hola {{jugador.nombre}}')
// ['jugador.nombre']

// Generar documentación Markdown
generateGlossaryMarkdown()
```

---

## 2. Helper de Validación

Sistema de validación para asegurar que los templates y contextos sean correctos.

### Archivo: `src/lib/validateVariables.ts`

### Funciones Principales

```typescript
// Validar un template
validateTemplate(text, context?, options?)
// Retorna: { valid, errors, warnings, variablesFound, ... }

// Validar un contexto
validateContext(context, requiredVariables?)
// Retorna: { valid, errors, warnings, variablesFound, ... }

// Detectar referencias cíclicas
detectCyclicReferences(text)
// Retorna: string[][] (ciclos encontrados)

// Obtener sugerencias para typos
getSuggestedVariables('jugador.nombr', 0.7)
// Retorna: ['jugador.nombre', 'npc.name', ...]
```

### Tipos de Errores

| Tipo | Descripción |
|------|-------------|
| `UNKNOWN` | Variable no definida en el glosario |
| `MISSING` | Variable requerida no encontrada en el contexto |
| `EMPTY` | Variable encontrada pero con valor vacío |
| `INVALID_NESTING` | Anidamiento incorrecto de variables |
| `CYCLIC_REFERENCE` | Referencia cíclica detectada |

---

## 3. Soporte para Plantillas Personalizadas

Sistema completo para crear, gestionar y renderizar plantillas personalizadas con variables.

### Archivo: `src/lib/customTemplates.ts`

### Funciones del Manager

```typescript
// Crear nueva plantilla
customTemplateManager.createTemplate(name, content, options?)

// Obtener plantilla
customTemplateManager.getTemplate(id)
customTemplateManager.getTemplateByName(name)

// Listar plantillas
customTemplateManager.getAllTemplates()
customTemplateManager.getActiveTemplates()
customTemplateManager.getTemplatesByCategory(category)
customTemplateManager.getTemplatesByTag(tag)
customTemplateManager.searchTemplates(query)

// Actualizar plantilla
customTemplateManager.updateTemplate(id, updates)

// Eliminar plantilla
customTemplateManager.deleteTemplate(id)

// Renderizar plantilla
customTemplateManager.renderTemplate(id, context, options?)
// Retorna: { content, success, variablesFound, ... }

// Validar plantilla
customTemplateManager.validateTemplate(id, context?)

// Duplicar plantilla
customTemplateManager.duplicateTemplate(id, newName)

// Exportar/Importar
customTemplateManager.exportTemplate(id)
customTemplateManager.importTemplate(jsonString)
```

### Estructura de una Plantilla

```typescript
interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  content: string;              // Template con variables {{...}}
  variables: string[];          // Variables encontradas
  category: 'user' | 'npc' | 'system' | 'custom';
  version: string;
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

---

## 4. Cache Inteligente

Implementación de cache LRU (Least Recently Used) para optimizar el rendimiento de plantillas.

### Archivo: `src/lib/templateCache.ts`

### Características

- **LRU Strategy**: Elimina automáticamente las entradas menos usadas
- **TTL Configurable**: Tiempo de vida por defecto de 30 minutos
- **Estadísticas**: Hits, misses, hit rate, uso de memoria
- **Invalidación Selectiva**: Por plantilla, sesión o todo el cache
- **Hashing Inteligente**: Solo considera propiedades relevantes del contexto

### Funciones Principales

```typescript
// Obtener del cache
templateCache.get(templateId, context)

// Guardar en cache
templateCache.set(templateId, context, renderedContent)

// Invalidar cache
templateCache.invalidateTemplate(templateId)
templateCache.invalidateSession(sessionId)
templateCache.invalidateAll()

// Obtener estadísticas
templateCache.getStats()
// Retorna: { entries, totalSize, usagePercent, hits, misses, hitRate, ... }

// Limpiar expirados
templateCache.cleanExpired()
```

### Configuración

```typescript
const cache = new TemplateCache({
  maxSize: 5 * 1024 * 1024,    // 5MB default
  maxEntries: 500,               // 500 entries default
  ttl: 30 * 60 * 1000,          // 30 minutes default
  enableStats: true
});
```

---

## 5. API Endpoints

### Validación de Variables

#### POST `/api/variables/validate`
Valida un template o texto con variables.

```json
// Request
{
  "text": "Hola {{jugador.nombre}}",
  "context": {
    "jugador": { "nombre": "Aldric" }
  },
  "options": {
    "checkUnknown": true,
    "checkMissing": true,
    "checkEmpty": false,
    "checkCyclic": true
  }
}

// Response
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "variablesFound": ["jugador.nombre"],
    "variablesDefined": [...],
    "missingRequired": []
  }
}
```

#### GET `/api/variables/validate`
Obtiene información sobre el sistema de variables.

| Query Param | Descripción |
|-------------|-------------|
| `category` | Filtrar por categoría (opcional) |
| `type` | `glossary` \| `stats` \| `extract` |
| `text` | Texto para extraer variables (requerido si type=extract) |

---

### Gestión de Plantillas

#### GET `/api/templates`
Lista todas las plantillas (con filtros opcionales).

```json
// Query params: ?category=user&active=true&tag=plantilla&search=hola
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

#### POST `/api/templates`
Crea una nueva plantilla.

```json
{
  "name": "Plantilla de Bienvenida",
  "content": "Hola {{jugador.nombre}}, bienvenido a {{mundo.name}}",
  "description": "Plantilla para dar la bienvenida",
  "category": "user",
  "tags": ["bienvenida", "saludo"],
  "active": true
}
```

#### PUT `/api/templates/[id]`
Actualiza una plantilla por ID.

#### DELETE `/api/templates/[id]`
Elimina una plantilla por ID.

#### POST `/api/templates/[id]/render`
Renderiza una plantilla con un contexto.

```json
{
  "context": {
    "jugador": { "nombre": "Aldric" },
    "world": { "name": "Esparcraft" }
  },
  "options": {
    "validate": true,
    "useCache": true
  }
}

// Response
{
  "success": true,
  "data": {
    "content": "Hola Aldric, bienvenido a Esparcraft",
    "fromCache": false,
    "success": true,
    "variablesFound": ["jugador.nombre", "mundo.name"],
    "variablesReplaced": ["jugador.nombre", "mundo.name"],
    "variablesNotFound": [],
    "errors": []
  }
}
```

#### POST `/api/templates/[id]/validate`
Valida una plantilla sin renderizarla.

#### POST `/api/templates/[id]/duplicate`
Duplica una plantilla.

---

### Gestión de Cache

#### GET `/api/cache/stats`
Obtiene estadísticas del cache.

```json
{
  "success": true,
  "data": {
    "entries": 45,
    "totalSize": 2345678,
    "usagePercent": 44.9,
    "hits": 1234,
    "misses": 567,
    "hitRate": 0.685,
    "topEntries": [...]
  }
}
```

#### DELETE `/api/cache/stats`
Limpia todo el cache.

---

## 6. Ejemplos de Uso

### Ejemplo 1: Validar un Template

```typescript
import { validateTemplate } from '@/lib/validateVariables';
import { VariableContext } from '@/lib/utils';

const context: VariableContext = {
  jugador: {
    nombre: 'Aldric',
    raza: 'Humano',
    nivel: '15'
  }
};

const template = 'Hola {{jugador.nombre}}, eres un {{jugador.raza}} de nivel {{jugador.nivel}}';

const result = validateTemplate(template, context);

if (result.valid) {
  console.log('✓ Template válido');
} else {
  console.error('✖ Errores:', result.errors);
}
```

### Ejemplo 2: Usar Cache en el Reemplazo

```typescript
import { replaceVariablesWithCache } from '@/lib/utils';
import { VariableContext } from '@/lib/utils';

const context: VariableContext = {
  jugador: { nombre: 'Aldric' },
  world: { name: 'Esparcraft' }
};

const template = 'Bienvenido a {{mundo.name}}, {{jugador.nombre}}';

// Primera llamada: MISS (procesa y guarda en cache)
const result1 = replaceVariablesWithCache(template, context, 'tpl_welcome');

// Segunda llamada: HIT (retorna del cache)
const result2 = replaceVariablesWithCache(template, context, 'tpl_welcome');
```

### Ejemplo 3: Crear y Renderizar Plantilla Personalizada

```typescript
import { customTemplateManager } from '@/lib/customTemplates';
import { VariableContext } from '@/lib/utils';

// Crear plantilla
const template = customTemplateManager.createTemplate(
  'Mensaje de Quest',
  '{{npc.name}}: "{{jugador.nombre}}, necesito tu ayuda en {{edificio.name}}."',
  {
    category: 'npc',
    tags: ['quest', 'mision'],
    active: true
  }
);

// Renderizar plantilla
const context: VariableContext = {
  npc: { card: { name: 'Theron el Herrero' } },
  jugador: { nombre: 'Aldric' },
  edificio: { name: 'Herrería' }
};

const result = customTemplateManager.renderTemplate(template.id, context);

console.log(result.content);
// "Theron el Herrero: "Aldric, necesito tu ayuda en Herrería.""
```

### Ejemplo 4: Validar Variables desde API

```javascript
// Cliente (fetch)
const response = await fetch('/api/variables/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hola {{jugador.nombre}}',
    context: {
      jugador: { nombre: 'Aldric' }
    }
  })
});

const { validation } = await response.json();
console.log('¿Válido?', validation.valid);
```

---

## 📌 Notas Importantes

1. **Compatibilidad**: El sistema mantiene compatibilidad total con el código existente.
2. **Cache Opcional**: El uso del cache es opcional y se puede deshabilitar.
3. **Recursividad**: El sistema maneja hasta 10 pasadas de reemplazo para variables anidadas.
4. **Performance**: El cache puede mejorar significativamente el rendimiento en aplicaciones con muchas plantillas.
5. **Logging**: Se incluyen logs de debug para seguimiento de hits/misses del cache.

---

## 🚀 Próximas Mejoras Sugeridas

1. Interfaz de usuario para gestión de plantillas
2. Editor visual con autocompletado de variables
3. Sistema de versiones de plantillas
4. Persistencia de plantillas en base de datos
5. Previsualización en tiempo real de plantillas
6. Exportación/importación masiva de plantillas

---

## 📚 Referencias

- Documentación completa del glosario: `GET /api/variables/validate?type=glossary`
- Estadísticas del sistema: `GET /api/variables/validate?type=stats`
- Código fuente: 
  - `src/lib/VARIABLE_GLOSSARY.ts`
  - `src/lib/validateVariables.ts`
  - `src/lib/customTemplates.ts`
  - `src/lib/templateCache.ts`
  - `src/lib/utils.ts`

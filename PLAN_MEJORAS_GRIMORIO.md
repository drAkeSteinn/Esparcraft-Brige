# Plan de Mejoras - Sistema de Variables del Grimorio

## 🎯 Objetivo General

Transformar el Grimorio en un sistema completo de gestión de variables y plantillas, diferenciando entre:

- **Variables Primarias**: Datos directos del contexto (`{{jugador.nombre}}`, `{{npc.name}}`, etc.)
- **Variables Tipo Plantilla**: Plantillas reutilizables que pueden contener variables primarias (`{{user_data}}`, `{{quest_info}}`, etc.)

---

## 📋 Reglas de Negocio Definidas

### 1. Variables Primarias en el Grimorio
- **Solo informativas (read-only)**
- El contenido no se edita (read-only)
- Sirven como documentación de qué variables existen y cómo se usan
- No se renderizan como plantilla

### 2. Comportamiento con Plantilla Faltante
- Si una plantilla referenciada no existe → **Retornar string vacío**
- No generar errores ni mensajes
- Ejemplo: `{{plantilla_inexistente}}` → `""`

### 3. Anidamiento de Variables
- **NO soportar múltiples niveles de anidamiento**
- Las keys tipo plantilla solo pueden tener anidadas keys primarias
- Si se detecta una plantilla dentro de otra plantilla → **Retornar string vacío**
- Esto previene bucles infinitos

### 4. Persistencia
- **Mantener sistema en formato JSON**
- No migrar a base de datos
- Usar el sistema actual de files del Grimorio

---

## 🔧 Flujo de Resolución de Variables

### Algoritmo de Resolución

```typescript
function resolveGrimorioVariable(variableName: string, context: VariableContext): string {
  // Paso 1: Identificar tipo de variable
  const variableType = identifyVariableType(variableName);
  
  // Paso 2: Si es variable primaria
  if (variableType === 'primaria') {
    // Extraer valor directo del contexto
    return extractFromContext(variableName, context);
  }
  
  // Paso 3: Si es tipo plantilla
  if (variableType === 'plantilla') {
    const template = grimorioManager.getByKey(variableName);
    
    // Paso 3a: Plantilla no existe
    if (!template) {
      return ''; // Regla 2: Retornar vacío
    }
    
    // Paso 3b: No es una plantilla válida
    if (template.tipo !== 'plantilla') {
      return ''; // No renderizar variables primarias como plantillas
    }
    
    // Paso 3c: Validar que no tenga plantillas anidadas (Regla 3)
    const nestedTemplates = extractTemplateVariables(template.plantilla);
    if (nestedTemplates.length > 0) {
      return ''; // Prevenir ciclos
    }
    
    // Paso 4: Extraer y reemplazar variables primarias
    const expanded = template.plantilla;
    return replaceVariables(expanded, context);
  }
  
  // Paso 5: Default (variable desconocida)
  return ''; // Retornar vacío
}
```

### Ejemplo de Flujo

```
Entrada: "Hola {{user_data}}, bienvenido a {{mundo.name}}"

Paso 1: Identificar variables
  - {{user_data}} → tipo: plantilla
  - {{mundo.name}} → tipo: primaria

Paso 2: Resolver {{user_data}} (plantilla)
  Buscar en Grimorio: user_data = "DATOS DEL AVENTURERO\nNombre: {{jugador.nombre}}..."
  ✓ Plantilla encontrada
  ✓ No tiene plantillas anidadas
  ✓ Expandir a: "DATOS DEL AVENTURERO\nNombre: {{jugador.nombre}}..."

Paso 3: Resolver variables primarias
  - {{jugador.nombre}} → "drAke"
  - {{jugador.raza}} → "Humano"
  - {{mundo.name}} → "Esparcraft"

Resultado final:
  "Hola DATOS DEL AVENTURERO
  Nombre: drAke
  Raza: Humano
  ..., bienvenido a Esparcraft"
```

### Casos Especiales

#### Caso 1: Plantilla Inexistente
```
Entrada: "{{plantilla_fantasma}}"
Resultado: "" (vacío según Regla 2)
```

#### Caso 2: Plantilla con Plantilla Anidada (Ciclo potencial)
```
Entrada: "{{plantilla_a}}"
Donde plantilla_a contiene: "Usa {{plantilla_b}}"
Donde plantilla_b contiene: "Vuelve a {{plantilla_a}}"

Resultado: "" (vacío según Regla 3 para prevenir ciclos)
```

#### Caso 3: Variable Primaria como Plantilla
```
Entrada: "{{jugador.nombre}}" como key en Grimorio (tipo: variable)
Resultado: Solo se muestra como referencia, no se renderiza
```

---

## 📁 Cambios en la Estructura de Datos

### Modelo Actual

```typescript
interface GrimorioCard {
  id: string;
  key: string;              // Identificador único
  nombre: string;
  plantilla: string;
  categoria: 'general' | 'jugador' | 'npc' | 'ubicacion' | 'mundo';
  descripcion?: string;
  timestamp: string;
}
```

### Nuevo Modelo

```typescript
// Tipos de cards del Grimorio
type GrimorioCardType = 'variable' | 'plantilla';

// Categorías actualizadas
type GrimorioCardCategory = 
  | 'general'          // Plantillas genéricas
  | 'variables'        // Variables primarias (solo informativas)
  | 'jugador'          // Plantillas de jugador
  | 'npc'              // Plantillas de NPC
  | 'ubicacion'        // Plantillas de ubicación
  | 'mundo';           // Plantillas de mundo

interface GrimorioCard {
  id: string;
  key: string;
  nombre: string;
  plantilla: string;       // Para tipo 'plantilla': contenido con variables
                            // Para tipo 'variable': puede estar vacío o con documentación
  categoria: GrimorioCardCategory;
  tipo: GrimorioCardType;  // ← NUEVO CAMPO
  descripcion?: string;
  timestamp: string;
}
```

### Migración de Datos

```typescript
// Lógica para migrar cards existentes
function migrateToNewSchema(card: GrimorioCard): GrimorioCard {
  return {
    ...card,
    tipo: determineTypeFromKey(card.key),
    categoria: card.categoria === 'general' ? card.categoria : 'variables'
  };
}

function determineTypeFromKey(key: string): GrimorioCardType {
  const primaryVariablePatterns = [
    /^jugador\./,
    /^npc\./,
    /^mundo\./,
    /^pueblo\./,
    /^edificio\./,
    /^session\./,
    /^(nombre|raza|nivel|salud|reputacion|almakos|deuda|piedras|hora|clima)$/,
    /^(playername|npcid|npc_name|npc_description)$/
  ];
  
  for (const pattern of primaryVariablePatterns) {
    if (pattern.test(key)) {
      return 'variable';
    }
  }
  
  return 'plantilla';
}
```

---

## 🎨 Cambios en la Interfaz de Usuario

### 1. GrimorioTab - Nuevo Selector de Tipo

```tsx
// En el formulario de creación/edición
<Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="plantilla">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        <span>Plantilla (reutilizable)</span>
      </div>
    </SelectItem>
    <SelectItem value="variable">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        <span>Variable Primaria (informativa)</span>
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

### 2. Visualización Diferenciada

```tsx
// En las cards de la lista
<Card className={card.tipo === 'variable' ? 'border-slate-300' : 'border-emerald-300'}>
  <Badge 
    variant={card.tipo === 'variable' ? 'secondary' : 'default'}
    className={card.tipo === 'variable' 
      ? 'bg-slate-100 text-slate-700' 
      : 'bg-emerald-100 text-emerald-700'
    }
  >
    {card.tipo === 'variable' ? '📊 Variable' : '📝 Plantilla'}
  </Badge>
  
  {card.tipo === 'variable' ? (
    <Database className="h-8 w-8 text-slate-500" />
  ) : (
    <FileText className="h-8 w-8 text-emerald-500" />
  )}
</Card>
```

### 3. Validación en Formulario

```tsx
// Validación según tipo
if (formData.tipo === 'variable') {
  // Validar que el key siga el formato de variable primaria
  if (!isPrimaryVariableFormat(formData.key)) {
    toast({
      title: 'Formato inválido',
      description: 'Las variables primarias deben seguir el formato: jugador.*, npc.*, etc.',
      variant: 'destructive'
    });
    return;
  }
  
  // El campo plantilla es opcional para variables
  // Se usa solo como documentación
} else if (formData.tipo === 'plantilla') {
  // Validar que la plantilla no contenga otras plantillas
  const nestedTemplates = extractTemplateVariables(formData.plantilla);
  if (nestedTemplates.length > 0) {
    toast({
      title: 'Plantillas anidadas no permitidas',
      description: `Se encontraron plantillas: ${nestedTemplates.join(', ')}`,
      variant: 'destructive'
    });
    return;
  }
}
```

### 4. VariablesReference - Dos Pestañas

```tsx
<Tabs defaultValue="primarias" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="primarias">
      <Database className="h-4 w-4 mr-2" />
      Variables Primarias
    </TabsTrigger>
    <TabsTrigger value="plantillas">
      <FileText className="h-4 w-4 mr-2" />
      Mis Plantillas
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="primarias">
    {/* Lista de variables primarias del glosario */}
  </TabsContent>
  
  <TabsContent value="plantillas">
    {/* Lista de plantillas del Grimorio con tipo 'plantilla' */}
  </TabsContent>
</Tabs>
```

---

## 🔌 Cambios en la API

### 1. Endpoints Actualizados

#### POST /api/grimorio
```typescript
// Request body extendido
{
  key: string;
  nombre: string;
  plantilla: string;
  categoria: GrimorioCardCategory;
  tipo: GrimorioCardType;  // ← Nuevo campo requerido
  descripcion?: string;
}

// Response - Validaciones adicionales
{
  success: true/false,
  data?: GrimorioCard,
  message?: string,
  // Nuevo campo para validaciones
  validations?: {
    nestedTemplates: string[];    // Plantillas anidadas detectadas
    missingVariables: string[];   // Variables primarias no encontradas
    warnings: string[];           // Advertencias
  }
}
```

#### GET /api/grimorio/[id]/validate
```typescript
// Nuevo endpoint para validar una plantilla
Response: {
  success: true,
  data: {
    valid: boolean,
    tipo: 'variable' | 'plantilla',
    variablesUsed: string[],          // Variables primarias usadas
    nestedTemplates: string[],          // Plantillas anidadas (error si tipo=plantilla)
    missingVariables: string[],         // Variables no existen en el glosario
    warnings: string[],
    preview?: string                   // Preview con contexto de prueba
  }
}
```

#### POST /api/grimorio/apply/[id]
```typescript
// Endpoint existente actualizado con nueva lógica
Request: {
  context: VariableContext;
  // Opcional: usar caché?
  useCache?: boolean;
}

Response: {
  success: true,
  data: {
    template: string;              // Resultado renderizado
    fromCache: boolean;
    stats: {
      variablesResolved: number;   // Cuántas variables se resolvieron
      templatesExpanded: number;   // Cuántas plantillas se expandieron
      emptyReturned: number;       // Cuántas retornaron vacío
      executionTime: number;       // Tiempo de ejecución en ms
    }
  }
}
```

---

## 🚀 Plan de Implementación por Fases

### Fase 1: Infraestructura Core (Backend)
**Prioridad: ALTA**
**Tiempo estimado: 2-3 horas**

#### Tarea 1.1: Actualizar Modelo
- [ ] Extender `GrimorioCard` con campo `tipo`
- [ ] Actualizar tipos en `src/lib/types.ts`
- [ ] Crear tipos derivados (`GrimorioCardType`, `GrimorioCardCategory`)

#### Tarea 1.2: Migración de Datos
- [ ] Crear script de migración
- [ ] Determinar tipo de cada card existente
- [ ] Actualizar archivos JSON del Grimorio
- [ ] Backup de datos antes de migrar

#### Tarea 1.3: Sistema de Resolución
- [ ] Crear `identifyVariableType()`
- [ ] Crear `resolveGrimorioVariable()`
- [ ] Implementar lógica de tipos (primaria vs plantilla)
- [ ] Implementar fallback a vacío

#### Tarea 1.4: Validación de Plantillas
- [ ] Crear `extractTemplateVariables()`
- [ ] Crear `validateTemplateStructure()`
- [ ] Detectar plantillas anidadas
- [ ] Validar variables primarias contra el glosario

#### Tarea 1.5: Actualizar API del Grimorio
- [ ] Actualizar `POST /api/grimorio` con campo tipo
- [ ] Validaciones en endpoint de creación
- [ ] Actualizar `PUT /api/grimorio/[id]`
- [ ] Crear `GET /api/grimorio/[id]/validate`

---

### Fase 2: Interfaz de Usuario (Frontend)
**Prioridad: ALTA**
**Tiempo estimado: 2-3 horas**

#### Tarea 2.1: Actualizar GrimorioTab
- [ ] Agregar selector de tipo en formulario
- [ ] Diferenciar iconos por tipo
- [ ] Colores diferenciados en badges
- [ ] Filtros adicionales por tipo

#### Tarea 2.2: Validación en Formulario
- [ ] Validación de formato de key según tipo
- [ ] Detección de plantillas anidadas
- [ ] Feedback visual en tiempo real
- [ ] Preview mejorado

#### Tarea 2.3: Mejorar VariablesReference
- [ ] Pestaña de "Variables Primarias"
- [ ] Pestaña de "Mis Plantillas"
- [ ] Búsqueda en ambas pestañas
- [ ] Copiar variables/plantillas al portapapeles

#### Tarea 2.4: Panel de Información
- [ ] Card de información por tipo
- [ ] Ejemplos de uso
- [ ] Advertencias y buenas prácticas

---

### Fase 3: Integración y Optimización
**Prioridad: MEDIA**
**Tiempo estimado: 1-2 horas**

#### Tarea 3.1: Integración con replaceVariables
- [ ] Integrar `resolveGrimorioVariable()` en el flujo
- [ ] Compatibilidad hacia atrás
- [ ] Tests de integración

#### Tarea 3.2: Sistema de Cache
- [ ] Cache para plantillas del Grimorio
- [ ] Invalidación al editar
- [ ] Estadísticas de uso

#### Tarea 3.3: Mejorar Endpoint Apply
- [ ] Usar nueva lógica de resolución
- [ ] Retornar estadísticas de ejecución
- [ ] Soporte opcional para cache

#### Tarea 3.4: Logging y Debugging
- [ ] Logs detallados de resolución
- [ ] Estadísticas de uso por tipo
- [ ] Tracking de errores frecuentes

---

### Fase 4: Documentación y Testing
**Prioridad: BAJA**
**Tiempo estimado: 1 hora**

#### Tarea 4.1: Documentación
- [ ] Actualizar README del Grimorio
- [ ] Ejemplos de uso con ambos tipos
- [ ] Diagramas de flujo de resolución
- [ ] Guía de buenas prácticas

#### Tarea 4.2: Testing Manual
- [ ] Tests de variables primarias
- [ ] Tests de plantillas
- [ ] Tests de casos extremos
- [ ] Tests de rendimiento

---

## 📊 Resumen del Plan

| Fase | Tareas | Prioridad | Tiempo Est. |
|-------|---------|------------|--------------|
| Fase 1 | 5 tareas | ALTA | 2-3 horas |
| Fase 2 | 4 tareas | ALTA | 2-3 horas |
| Fase 3 | 4 tareas | MEDIA | 1-2 horas |
| Fase 4 | 2 tareas | BAJA | 1 hora |
| **Total** | **15 tareas** | - | **6-9 horas** |

---

## ✅ Criterios de Aceptación del MVP

Al finalizar las Fases 1 y 2, el sistema debe:

- [ ] Diferenciar entre variables primarias y plantillas en el Grimorio
- [ ] Renderizar variables primarias desde el contexto
- [ ] Expandir plantillas y reemplazar sus variables internas
- [ ] Retornar vacío si una plantilla no existe
- [ ] Retornar vacío si hay plantillas anidadas
- [ ] Validar formatos de keys según tipo
- [ ] Mostrar iconos y colores diferenciados por tipo
- [ ] Permitir búsqueda en variables primarias y plantillas
- [ ] Previsualizar plantillas con contexto de prueba
- [ ] Mantener compatibilidad con código existente

---

## 🎁 Funcionalidades Futuras (Post-MVP)

- Autocompletado de variables y plantillas al escribir
- Visualizador de dependencias tipo árbol
- Importar/Exportar sets de plantillas
- Sistema de versiones de plantillas
- Editor visual con formato
- Plantillas predefinidas del sistema
- Estadísticas de uso de plantillas
- Ranking de plantillas más usadas

---

**Documento creado el:** 26 de enero de 2025  
**Versión:** 1.0  
**Estado:** Pendiente de aprobación para iniciar implementación

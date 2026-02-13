# Plan de Trabajo: Sistema de Embeddings con LanceDB + Ollama

## Resumen Ejecutivo

Este documento detalla el plan de trabajo por fases para implementar un sistema completo y funcional de embeddings utilizando exclusivamente **LanceDB** como base de datos vectorial e **Ollama** como proveedor de embeddings.

---

## Estado Actual del Sistema

### Componentes Existentes
| Componente | Estado | Observaciones |
|------------|--------|---------------|
| `lancedb-db.ts` | Funcional | Wrapper básico de LanceDB |
| `embeddings-db.ts` | Obsoleto | Usa PostgreSQL (a eliminar) |
| `ollama-client.ts` | Funcional | Cliente de Ollama para embeddings |
| `embeddings/client.ts` | Parcial | Usa LanceDBWrapper pero con código legacy |
| `LanceDBConfig.tsx` | Básico | Solo configuración de ruta |
| `EmbeddingsConfig.tsx` | Mejorable | Filtra modelos por nombre "embed" |
| `RouterTab.tsx` | Sin embeddings | No tiene switchers para embeddings |

### Problemas Identificados
1. **Código PostgreSQL residual** en `embeddings-db.ts` (debe eliminarse)
2. **Detección de modelos Ollama** filtra solo modelos con "embed" en el nombre
3. **Sin integración en Router** para activar/desactivar embeddings
4. **Visualización deficiente** en tab de Embeddings
5. **Dependencias LanceDB** pueden tener problemas cross-platform

---

## FASE 1: Limpieza y Preparación del Sistema

### Objetivo
Eliminar código obsoleto y preparar la arquitectura para LanceDB exclusivamente.

### Tareas

#### 1.1 Eliminar código PostgreSQL
- [ ] Eliminar archivo `src/lib/embeddings-db.ts` completamente
- [ ] Eliminar dependencia `pg` del `package.json`
- [ ] Eliminar tipos relacionados con PostgreSQL
- [ ] Limpiar imports en archivos que referencien `embeddings-db.ts`

#### 1.2 Verificar dependencias LanceDB
```json
// Verificar que @lancedb/lancedb esté correctamente instalado
// Nota: LanceDB tiene dependencias nativas que pueden variar entre Windows/Linux
```

- [ ] Verificar instalación en Windows
- [ ] Verificar instalación en Linux
- [ ] Documentar requisitos específicos por SO

#### 1.3 Consolidar tipos de embeddings
- [ ] Mover todos los tipos a `src/lib/embeddings/types.ts`
- [ ] Eliminar tipos duplicados entre archivos
- [ ] Crear tipos específicos para configuración de Router

#### 1.4 Actualizar variables de entorno
```env
# Eliminar variables PostgreSQL
# EMBEDDINGS_DB_HOST, EMBEDDINGS_DB_PORT, etc.

# Mantener solo LanceDB y Ollama
LANCEDB_URI=./data/lancedb
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768
DEFAULT_SIMILARITY_THRESHOLD=0.7
```

### Criterios de Aceptación
- [ ] No existe código PostgreSQL en el proyecto
- [ ] LanceDB funciona en Windows y Linux
- [ ] Todos los tipos consolidados en un archivo
- [ ] Variables de entorno limpias

---

## FASE 2: Configuración de Ollama

### Objetivo
Mejorar la detección de modelos instalados en Ollama sin recomendaciones.

### Tareas

#### 2.1 Nuevo endpoint para listar todos los modelos
```typescript
// GET /api/settings/ollama-models
// Debe retornar TODOS los modelos instalados sin filtrar
{
  success: true,
  data: {
    models: [
      { name: "nomic-embed-text:latest", size: 274000000, modified_at: "..." },
      { name: "bge-m3:567m", size: 1200000000, modified_at: "..." },
      // ... todos los demás
    ]
  }
}
```

- [ ] Modificar `api/settings/ollama-models/route.ts` para NO filtrar
- [ ] Retornar información completa de cada modelo (size, modified_at, details)

#### 2.2 Mejorar EmbeddingsConfig.tsx
- [ ] Mostrar TODOS los modelos instalados en el dropdown
- [ ] Agrupar modelos por tipo (embeddings, chat, etc.) opcionalmente
- [ ] Mostrar información relevante:
  - Nombre completo (incluyendo tag)
  - Tamaño en GB/MB
  - Última modificación
  - Dimensión conocida (si es modelo conocido)

#### 2.3 Detección automática de dimensiones
```typescript
// Mapa de modelos conocidos a sus dimensiones
const MODEL_DIMENSIONS: Record<string, number> = {
  'nomic-embed-text': 768,
  'bge-m3': 1024,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  // ... más modelos
};
```

- [ ] Crear mapa de dimensiones conocidas
- [ ] Auto-detectar dimensión al seleccionar modelo
- [ ] Permitir override manual si modelo es desconocido

#### 2.4 Validación de modelo antes de usar
- [ ] Verificar que el modelo existe en Ollama antes de guardar config
- [ ] Probar embedding con el modelo seleccionado
- [ ] Mostrar error claro si el modelo no funciona

### Criterios de Aceptación
- [ ] Todos los modelos de Ollama se listan (no solo "embed")
- [ ] Usuario puede seleccionar cualquier modelo instalado
- [ ] Dimensión se detecta automáticamente para modelos conocidos
- [ ] Errores son claros y accionables

---

## FASE 3: LanceDB Cross-Platform

### Objetivo
Garantizar que LanceDB funcione correctamente en Windows y Linux.

### Tareas

#### 3.1 Verificar dependencias nativas
```bash
# LanceDB usa Arrow que tiene dependencias nativas
# Verificar que los binaries estén disponibles para ambos SO
```

- [ ] Documentar requisitos de sistema para Windows
- [ ] Documentar requisitos de sistema para Linux
- [ ] Verificar que `@lancedb/lancedb` v0.26.2 funciona en ambos

#### 3.2 Manejo de rutas multiplataforma
```typescript
import path from 'path';

// Usar path.join para rutas multiplataforma
const dbPath = path.join(process.cwd(), 'data', 'lancedb');

// En Windows: C:\project\data\lancedb
// En Linux: /home/user/project/data/lancedb
```

- [ ] Usar `path.join()` para todas las rutas
- [ ] Manejar permisos de escritura en ambos SO
- [ ] Crear directorios automáticamente si no existen

#### 3.3 Configuración específica por SO
```typescript
// Detectar SO y ajustar configuración
const isWindows = process.platform === 'win32';
const dbUri = isWindows
  ? path.resolve('./data/lancedb')
  : './data/lancedb';
```

- [ ] Detectar SO en runtime
- [ ] Ajustar rutas automáticamente
- [ ] Documentar diferencias de comportamiento

#### 3.4 Manejo de errores específicos
- [ ] Capturar errores de permisos en Windows
- [ ] Capturar errores de permisos en Linux
- [ ] Mensajes de error claros y soluciones sugeridas

#### 3.5 Backup y migración de datos
- [ ] Implementar exportación de embeddings a JSON
- [ ] Implementar importación de embeddings desde JSON
- [ ] Permitir migrar datos entre sistemas

### Criterios de Aceptación
- [ ] LanceDB funciona en Windows
- [ ] LanceDB funciona en Linux
- [ ] Rutas se manejan correctamente en ambos SO
- [ ] Errores son informativos con soluciones

---

## FASE 4: Integración en Router Tab

### Objetivo
Agregar switchers para habilitar/deshabilitar embeddings en cada sección del Router.

### Tareas

#### 4.1 Diseñar UI del switcher
```tsx
// Componente reutilizable para activar embeddings
<EmbeddingSwitcher
  enabled={form.useEmbeddings}
  onToggle={(enabled) => setForm({ ...form, useEmbeddings: enabled })}
  namespace="chat-npc"
  config={{
    maxResults: 5,
    threshold: 0.7
  }}
/>
```

- [ ] Crear componente `EmbeddingSwitcher`
- [ ] Diseño consistente con el tema pixel art
- [ ] Estado visual claro (on/off)

#### 4.2 Secciones del Router a modificar

**Chat Trigger:**
- [ ] Agregar switcher para usar embeddings en contexto del NPC
- [ ] Configurar namespace automático: `npc-{npcid}`
- [ ] Opción para incluir embeddings de mundo/pueblo/edificio

**Resumen Sesión Trigger:**
- [ ] Agregar switcher para buscar en resúmenes previos
- [ ] Configurar namespace: `session-summaries`
- [ ] Incluir resúmenes similares como contexto

**Resumen NPC Trigger:**
- [ ] Agregar switcher para embeddings de NPC
- [ ] Configurar namespace: `npc-summaries`
- [ ] Buscar patrones en resúmenes previos

**Resumen Edificio/Pueblo/Mundo Trigger:**
- [ ] Agregar switcher para cada nivel
- [ ] Namespaces jerárquicos

#### 4.3 Lógica de integración
```typescript
// Al construir el prompt, si embeddings está activado:
if (useEmbeddings) {
  const embeddingClient = getEmbeddingClient();
  const relevantContext = await embeddingClient.searchSimilar({
    query: userMessage,
    namespace: currentNamespace,
    limit: 5,
    threshold: 0.7
  });

  // Agregar contexto relevante al prompt
  context.embeddings = relevantContext;
}
```

- [ ] Modificar `buildChatPayload()` para incluir embeddings
- [ ] Modificar `buildResumenSesionPayload()` para incluir embeddings
- [ ] Modificar demás builders de payload

#### 4.4 Preview con embeddings
- [ ] Mostrar embeddings encontrados en el preview
- [ ] Indicar relevancia de cada resultado
- [ ] Permitir ver contenido del embedding

### Criterios de Aceptación
- [ ] Cada sección tiene un switcher claro
- [ ] Switcher habilita/deshabilita embeddings
- [ ] Preview muestra embeddings cuando están activados
- [ ] Los embeddings se incluyen en el prompt cuando están activados

---

## FASE 5: Visualización de Embeddings

### Objetivo
Crear una interfaz completa para visualizar y gestionar namespaces y embeddings.

### Tareas

#### 5.1 Nueva estructura de la tab Embeddings
```
Embeddings Tab
├── Resumen General (stats)
│   ├── Total embeddings
│   ├── Total namespaces
│   └── Uso por tipo
├── Namespaces (lista expandible)
│   ├── Namespace 1
│   │   ├── Info (descripción, metadata)
│   │   ├── Conteo de embeddings
│   │   └── Acciones (ver, eliminar)
│   └── Namespace 2 ...
└── Archivos/Embeddings por namespace
    └── Lista de embeddings
        ├── Preview de contenido
        ├── Metadata
        └── Similitud con query
```

#### 5.2 Componentes a crear

**EmbeddingStatsCard:**
```tsx
// Estadísticas generales del sistema
<Card>
  <Stat label="Total Embeddings" value={1234} />
  <Stat label="Namespaces" value={15} />
  <Stat label="Almacenamiento" value="125 MB" />
</Card>
```

- [ ] Crear componente de estadísticas
- [ ] Gráficos de uso por tipo/namespace

**NamespaceList:**
```tsx
// Lista de namespaces con acciones
<Accordion>
  {namespaces.map(ns => (
    <NamespaceItem
      key={ns.id}
      namespace={ns}
      embeddingsCount={counts[ns.name]}
      onView={() => ...}
      onDelete={() => ...}
    />
  ))}
</Accordion>
```

- [ ] Crear componente de lista de namespaces
- [ ] Acciones: ver detalles, eliminar, exportar

**EmbeddingListView:**
```tsx
// Vista de embeddings dentro de un namespace
<Table>
  <Column header="ID" />
  <Column header="Contenido (preview)" />
  <Column header="Source" />
  <Column header="Creado" />
  <Column header="Acciones" />
</Table>
```

- [ ] Crear tabla de embeddings
- [ ] Preview truncado del contenido
- [ ] Paginación para namespaces grandes

**EmbeddingSearchBar:**
```tsx
// Búsqueda semántica dentro de embeddings
<Input placeholder="Buscar embeddings..." />
<Button>Buscar</Button>
<Results>
  {results.map(r => (
    <EmbeddingResult
      content={r.content}
      similarity={r.similarity}
    />
  ))}
</Results>
```

- [ ] Búsqueda semántica con Ollama
- [ ] Mostrar similitud de resultados

#### 5.3 Acciones disponibles
- [ ] Ver contenido completo del embedding
- [ ] Eliminar embedding individual
- [ ] Eliminar namespace completo
- [ ] Exportar namespace a JSON
- [ ] Importar embeddings desde JSON

#### 5.4 Información mostrada por embedding
```typescript
interface EmbeddingDisplay {
  id: string;
  content_preview: string; // Primeros 100 caracteres
  source_type: 'npc' | 'session' | 'world' | 'custom';
  source_id: string;
  source_name?: string; // Nombre del NPC, mundo, etc.
  namespace: string;
  created_at: Date;
  model_name: string;
  dimension: number;
}
```

### Criterios de Aceptación
- [ ] Vista clara de namespaces y sus embeddings
- [ ] Búsqueda semántica funciona correctamente
- [ ] Acciones de gestión funcionan (eliminar, exportar)
- [ ] Preview de contenido es útil
- [ ] Diseño consistente con tema pixel art

---

## FASE 6: Testing y Documentación

### Objetivo
Garantizar calidad y documentar el sistema.

### Tareas

#### 6.1 Tests de integración
- [ ] Test: Crear embedding y verificar almacenamiento
- [ ] Test: Buscar embeddings similares
- [ ] Test: Eliminar embedding
- [ ] Test: Crear/eliminar namespace
- [ ] Test: Integración con Ollama

#### 6.2 Tests cross-platform
- [ ] Verificar funcionamiento en Windows
- [ ] Verificar funcionamiento en Linux
- [ ] Verificar migración de datos entre SO

#### 6.3 Documentación
- [ ] README con instalación y configuración
- [ ] Guía de uso de embeddings
- [ ] Troubleshooting para problemas comunes
- [ ] API documentation para endpoints

#### 6.4 Optimizaciones
- [ ] Caching de embeddings frecuentes
- [ ] Batch processing para múltiples embeddings
- [ ] Indexación para búsquedas rápidas

### Criterios de Aceptación
- [ ] Tests pasan en Windows y Linux
- [ ] Documentación completa
- [ ] Sistema funciona end-to-end

---

## Dependencias y Requisitos

### Dependencias Actuales (mantener)
```json
{
  "@lancedb/lancedb": "^0.26.2",
  "uuid": "^11.1.0"
}
```

### Dependencias a Eliminar
```json
{
  "pg": "^8.17.1",
  "@types/pg": "^8.16.0"
}
```

### Nuevas Dependencias (considerar)
```json
{
  // Para exportación de datos
  "archiver": "^7.0.0",  // Zip files
  // Para validación
  "zod": "^4.0.2"  // Ya instalado
}
```

---

## Arquitectura Final Propuesta

```
src/
├── lib/
│   ├── embeddings/
│   │   ├── client.ts          # Cliente unificado (actualizado)
│   │   ├── ollama-client.ts   # Cliente Ollama (actualizado)
│   │   └── types.ts           # Tipos consolidados
│   ├── lancedb-db.ts          # Wrapper LanceDB (mejorado)
│   └── db.ts                  # Prisma (sin cambios)
├── components/
│   └── dashboard/
│       ├── settings/
│       │   ├── LanceDBConfig.tsx    # Mejorado
│       │   ├── EmbeddingsConfig.tsx # Mejorado
│       │   └── EmbeddingSwitcher.tsx # Nuevo
│       └── embeddings/              # Nueva carpeta
│           ├── EmbeddingStatsCard.tsx
│           ├── NamespaceList.tsx
│           ├── EmbeddingListView.tsx
│           └── EmbeddingSearchBar.tsx
└── app/
    └── api/
        ├── embeddings/         # Endpoints existentes
        └── settings/
            ├── ollama-models/  # Mejorado
            └── test-embeddings/ # Mejorado
```

---

## Cronograma Estimado

| Fase | Duración Estimada | Dependencias |
|------|-------------------|--------------|
| Fase 1 | 2-3 horas | Ninguna |
| Fase 2 | 3-4 horas | Fase 1 |
| Fase 3 | 2-3 horas | Fase 1 |
| Fase 4 | 4-5 horas | Fase 2, 3 |
| Fase 5 | 5-6 horas | Fase 4 |
| Fase 6 | 2-3 horas | Fase 5 |

**Total Estimado: 18-24 horas de trabajo**

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| LanceDB incompatibilidad Windows | Media | Alto | Probar temprano, documentar workaround |
| Ollama no tiene modelos | Baja | Medio | Guía clara de instalación |
| Rendimiento con muchos embeddings | Media | Medio | Implementar paginación y caching |
| Migración de datos PostgreSQL | Baja | Bajo | Ya decidido eliminar PostgreSQL |

---

## Notas Adicionales

### Modelos de Embeddings Recomendados para Ollama
- **nomic-embed-text**: 768 dimensiones, rápido, buena calidad
- **bge-m3**: 1024 dimensiones, multilingual
- **mxbai-embed-large**: 1024 dimensiones, alta calidad

### Consideraciones de Rendimiento
- LanceDB maneja índices automáticamente
- Considerar vaciar embeddings antiguos periódicamente
- Batch processing para inserciones múltiples

### Backup de Datos
```bash
# LanceDB guarda datos en archivos .lancedb
# Para backup, simplemente copiar el directorio
cp -r ./data/lancedb ./backup/lancedb_$(date +%Y%m%d)
```

---

*Documento creado: [Fecha actual]*
*Última actualización: [Fecha actual]*
*Autor: Sistema de desarrollo*

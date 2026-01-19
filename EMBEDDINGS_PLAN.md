# Plan de Implementación - Sistema de Embeddings

## 📋 Descripción General

Implementación de un sistema de embeddings para la aplicación Bridge IA, similar al de Flowise, usando:
- **Text Generation WebUI** para la generación de embeddings
- **PostgreSQL** con **pgvector** para almacenamiento vectorial
- **Postgres Record Manager** para gestión de documentos
- Integración con el router y triggers existentes

## 🎯 Objetivos

1. Migrar de SQLite a PostgreSQL con soporte pgvector
2. Implementar sistema de embeddings para documentos
3. Crear pestaña de gestión de embeddings en el UI
4. Integrar con el router de chat existente
5. Implementar triggers automáticos para embedding
6. Crear Record Manager similar a Flowise

---

## 📊 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat Router  │  │ Embeddings   │  │ Record       │      │
│  │  (Triggers)  │  │  Tab        │  │ Manager      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│                   Backend (Next.js API)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/embed   │  │ /api/search  │  │ /api/record  │      │
│  │  - create    │  │  - vector    │  │  - manage    │      │
│  │  - delete    │  │  - hybrid    │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼────────────┐
│         │                  │                  │            │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │  Prisma     │  │  pgvector   │  │  LangChain   │      │
│  │  ORM        │  │  Extension  │  │  Document   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
┌─────────┴──────────────────┴──────────────────┴────────────┐
│              PostgreSQL (Base de Datos)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Embeddings   │  │ Records      │  │ Metadata     │      │
│  │ Table       │  │ Table        │  │ Table        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
          │
┌─────────┴────────────────────────────────────────────────────┐
│         Text Generation WebUI (Embeddings API)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/embeddings (POST)                             │   │
│  │  {                                                  │   │
│  │    "input": "text to embed",                         │   │
│  │    "model": "text-embedding-model"                   │   │
│  │  }                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Fase 1: Configuración de Base de Datos

### Tarea 1.1: Instalar y Configurar PostgreSQL
- [ ] Instalar PostgreSQL localmente
- [ ] Instalar extensión pgvector
- [ ] Configurar usuario y base de datos
- [ ] Probar conexión

**Archivos afectados:**
- `.env` - Nuevas variables de conexión PostgreSQL
- `prisma/schema.prisma` - Cambiar provider a postgresql

**Tiempo estimado:** 30 minutos

---

### Tarea 1.2: Migrar Schema de Prisma a PostgreSQL
- [ ] Actualizar provider en schema.prisma
- [ ] Definir modelos para embeddings
- [ ] Crear tablas con soporte vectorial
- [ ] Crear índices de búsqueda vectorial

**Modelos a crear:**
```prisma
model Document {
  id            String   @id @default(cuid())
  content       String
  metadata      Json
  embeddingId   String?
  embedding     Embedding @relation(fields: [embeddingId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([createdAt])
}

model Embedding {
  id        String   @id @default(cuid())
  vector    Unsupported("vector(1536)") // pgvector
  model     String
  documents Document[]
  createdAt DateTime @default(now())
}

model RecordManager {
  id            String   @id @default(cuid())
  namespace     String   @unique
  documentIds   String[]
  metadata      Json
  lastUpdated  DateTime @updatedAt
}
```

**Archivos afectados:**
- `prisma/schema.prisma`
- `src/lib/db.ts`

**Tiempo estimado:** 45 minutos

---

### Tarea 1.3: Migrar Datos Existentes
- [ ] Crear script de migración SQLite → PostgreSQL
- [ ] Migrar datos de Worlds, Pueblos, Edificios, NPCs
- [ ] Migrar Sessions y Chat Messages
- [ ] Verificar integridad de datos

**Archivos a crear:**
- `scripts/migrate-sqlite-to-postgres.ts`

**Tiempo estimado:** 1 hora

---

## 🔌 Fase 2: Integración con Text Generation WebUI

### Tarea 2.1: Configurar Cliente de Embeddings
- [ ] Crear cliente para API de Text Generation WebUI
- [ ] Implementar función de embedding
- [ ] Manejo de errores y retries
- [ ] Configurar timeouts y rate limiting

**Archivos a crear:**
- `src/lib/embeddings/client.ts`
- `src/lib/embeddings/types.ts`

**Tiempo estimado:** 45 minutos

---

### Tarea 2.2: Implementar Funciones de Embedding
- [ ] `embedText()` - Embed un solo texto
- [ ] `embedBatch()` - Embed múltiples textos
- [ ] `embedDocument()` - Embed documento completo
- [ ] `updateEmbedding()` - Actualizar embedding existente

**Archivos afectados:**
- `src/lib/embeddings/client.ts`

**Tiempo estimado:** 1 hora

---

### Tarea 2.3: Configurar Variables de Entorno
- [ ] `TEXT_GEN_WEBUI_URL` - URL del servidor Text Generation WebUI
- [ ] `EMBEDDING_MODEL` - Modelo de embeddings a usar
- [ ] `EMBEDDING_DIMENSION` - Dimensión del vector (ej: 1536)
- [ ] `EMBEDDING_BATCH_SIZE` - Tamaño del batch

**Archivos afectados:**
- `.env`
- `.env.example`

**Tiempo estimado:** 15 minutos

---

## 📦 Fase 3: Backend API - Embeddings

### Tarea 3.1: Crear API Routes para Embeddings
- [ ] `POST /api/embeddings/create` - Crear embedding
- [ ] `POST /api/embeddings/batch` - Crear múltiples embeddings
- [ ] `DELETE /api/embeddings/[id]` - Eliminar embedding
- [ ] `GET /api/embeddings/[id]` - Obtener embedding

**Archivos a crear:**
- `src/app/api/embeddings/create/route.ts`
- `src/app/api/embeddings/batch/route.ts`
- `src/app/api/embeddings/[id]/route.ts`

**Tiempo estimado:** 1.5 horas

---

### Tarea 3.2: Implementar Búsqueda Vectorial
- [ ] `POST /api/search/vector` - Búsqueda pura por similitud
- [ ] `POST /api/search/hybrid` - Búsqueda híbrida (texto + vector)
- [ ] `GET /api/search/similar` - Documentos similares
- [ ] Implementar ranking de resultados

**Archivos a crear:**
- `src/app/api/search/vector/route.ts`
- `src/app/api/search/hybrid/route.ts`
- `src/lib/embeddings/search.ts`

**Tiempo estimado:** 2 horas

---

### Tarea 3.3: Implementar Record Manager
- [ ] `POST /api/record/add` - Agregar documento a un namespace
- [ ] `GET /api/record/[namespace]` - Listar documentos del namespace
- [ ] `DELETE /api/record/[namespace]` - Eliminar namespace completo
- [ ] `POST /api/record/update` - Actualizar documento
- [ ] `GET /api/record/search` - Buscar en namespace específico

**Archivos a crear:**
- `src/app/api/record/add/route.ts`
- `src/app/api/record/[namespace]/route.ts`
- `src/lib/embeddings/record-manager.ts`

**Tiempo estimado:** 2 horas

---

## 🎨 Fase 4: Frontend UI - Pestaña de Embeddings

### Tarea 4.1: Crear Pestaña de Embeddings
- [ ] Crear componente EmbeddingsTab
- [ ] Diseñar layout de la pestaña
- [ ] Implementar navegación
- [ ] Agregar al dashboard principal

**Archivos a crear:**
- `src/components/dashboard/embeddings/EmbeddingsTab.tsx`
- `src/components/dashboard/embeddings/EmbeddingsLayout.tsx`

**Tiempo estimado:** 1 hora

---

### Tarea 4.2: Crear Componente de Gestión de Documentos
- [ ] Lista de documentos embebidos
- [ ] Crear nuevo documento
- [ ] Editar documento existente
- [ ] Eliminar documento
- [ ] Vista detallada del documento

**Archivos a crear:**
- `src/components/dashboard/embeddings/DocumentList.tsx`
- `src/components/dashboard/embeddings/DocumentForm.tsx`
- `src/components/dashboard/embeddings/DocumentCard.tsx`

**Tiempo estimado:** 2 horas

---

### Tarea 4.3: Crear Componente de Búsqueda
- [ ] Input de búsqueda
- [ ] Selector de namespace/record
- [ ] Opciones de búsqueda (vectorial, híbrida)
- [ ] Resultados de búsqueda con scores
- [ ] Preview de contenido

**Archivos a crear:**
- `src/components/dashboard/embeddings/SearchPanel.tsx`
- `src/components/dashboard/embeddings/SearchResults.tsx`

**Tiempo estimado:** 1.5 horas

---

### Tarea 4.4: Crear Componente de Record Manager
- [ ] Lista de namespaces/records
- [ ] Crear nuevo namespace
- [ ] Agregar documentos al namespace
- [ ] Ver documentos del namespace
- [ ] Eliminar namespace

**Archivos a crear:**
- `src/components/dashboard/embeddings/RecordManagerList.tsx`
- `src/components/dashboard/embeddings/RecordManagerForm.tsx`
- `src/components/dashboard/embeddings/RecordManagerCard.tsx`

**Tiempo estimado:** 2 horas

---

### Tarea 4.5: Crear Componentes de Visualización
- [ ] Visualización del vector (opcional)
- [ ] Gráfico de similitud
- [ ] Estadísticas de embeddings
- [ ] Historial de cambios

**Archivos a crear:**
- `src/components/dashboard/embeddings/EmbeddingStats.tsx`
- `src/components/dashboard/embeddings/SimilarityChart.tsx`

**Tiempo estimado:** 1 hora

---

## 🔗 Fase 5: Integración con Router y Triggers

### Tarea 5.1: Actualizar Router de Chat
- [ ] Integrar búsqueda de embeddings en el chat
- [ ] Obtener contexto relevante de embeddings
- [ ] Incorporar contexto al prompt
- [ ] Configurar umbral de similitud

**Archivos afectados:**
- `src/lib/chat/router.ts` (o el archivo existente de router)
- `src/lib/chat/prompt-builder.ts`

**Tiempo estimado:** 1.5 horas

---

### Tarea 5.2: Crear Triggers Automáticos de Embedding
- [ ] Trigger al crear NPC nuevo → Embed lore del NPC
- [ ] Trigger al crear World nuevo → Embed lore del mundo
- [ ] Trigger al crear Pueblo/Nación → Embed lore de la región
- [ ] Trigger al crear Edificio → Embed lore del edificio
- [ ] Trigger al guardar sesión → Embed resumen de sesión

**Archivos a crear:**
- `src/lib/embeddings/triggers.ts`
- `src/lib/embeddings/auto-embed.ts`

**Tiempo estimado:** 2 horas

---

### Tarea 5.3: Implementar Context Retrieval Dinámico
- [ ] Función para obtener contexto relevante
- [ ] Filtrar por tipo de documento
- [ ] Filtrar por ubicación (world, pueblo, edificio)
- [ - Ordenar por relevancia
- [ ] Límite de contexto en tokens

**Archivos a crear:**
- `src/lib/embeddings/context-retrieval.ts`

**Tiempo estimado:** 1.5 horas

---

## 🚀 Fase 6: Pruebas y Optimización

### Tarea 6.1: Pruebas Unitarias
- [ ] Pruebas de cliente de embeddings
- [ ] Pruebas de API routes
- [ ] Pruebas de búsqueda vectorial
- [ ] Pruebas de Record Manager

**Archivos a crear:**
- `tests/embeddings/client.test.ts`
- `tests/embeddings/search.test.ts`
- `tests/embeddings/record-manager.test.ts`

**Tiempo estimado:** 2 horas

---

### Tarea 6.2: Pruebas de Integración
- [ ] Test de flujo completo: crear → embed → buscar
- [ ] Test de triggers automáticos
- [ ] Test de integración con chat
- [ ] Test de performance

**Archivos a crear:**
- `tests/integration/embeddings-flow.test.ts`

**Tiempo estimado:** 2 horas

---

### Tarea 6.3: Optimización de Performance
- [ ] Implementar caché de embeddings
- [ ] Optimizar queries vectoriales
- [ ] Implementar batching en embeddings
- [ ] Indexación eficiente

**Archivos afectados:**
- `src/lib/embeddings/client.ts`
- `src/lib/embeddings/search.ts`

**Tiempo estimado:** 1.5 horas

---

## 📚 Fase 7: Documentación

### Tarea 7.1: Documentación de Instalación
- [ ] Guía de instalación de PostgreSQL + pgvector
- [ ] Configuración de Text Generation WebUI
- [ ] Configuración de variables de entorno
- [ ] Migración desde SQLite

**Archivos a crear:**
- `docs/EMBEDDINGS_SETUP.md`
- `docs/POSTGRES_SETUP.md`

**Tiempo estimado:** 1 hora

---

### Tarea 7.2: Documentación de Uso
- [ ] Guía de uso de la pestaña de embeddings
- [ ] Guía de búsqueda vectorial
- [ ] Guía de Record Manager
- [ ] Guía de configuración de triggers

**Archivos a crear:**
- `docs/EMBEDDINGS_USAGE.md`
- `docs/RECORD_MANAGER_GUIDE.md`

**Tiempo estimado:** 1 hora

---

## 📝 Resumen de Tiempos

| Fase | Tiempo Estimado |
|------|----------------|
| Fase 1: Configuración BD | 2h 15min |
| Fase 2: Text Gen WebUI | 2h |
| Fase 3: Backend API | 5.5h |
| Fase 4: Frontend UI | 7.5h |
| Fase 5: Router y Triggers | 5h |
| Fase 6: Pruebas | 5.5h |
| Fase 7: Documentación | 2h |
| **Total** | **~30 horas** |

---

## 🎯 Hitos Principales

1. ✅ **Hito 1:** Base de datos PostgreSQL configurada con pgvector
2. ✅ **Hito 2:** Cliente de Text Generation WebUI funcional
3. ✅ **Hito 3:** API de embeddings creada y probada
4. ✅ **Hito 4:** Pestaña de embeddings en el UI
5. ✅ **Hito 5:** Record Manager funcional
6. ✅ **Hito 6:** Integración con router de chat
7. ✅ **Hito 7:** Triggers automáticos implementados
8. ✅ **Hito 8:** Sistema completo probado y documentado

---

## 🔄 Flujo de Trabajo Sugerido

1. **Configurar base de datos** (Fase 1)
2. **Probar cliente de embeddings** (Fase 2)
3. **Crear API básica** (Fase 3.1)
4. **Crear UI básica** (Fase 4.1-4.2)
5. **Implementar búsqueda** (Fase 3.2, 4.3)
6. **Implementar Record Manager** (Fase 3.3, 4.4)
7. **Integrar con router** (Fase 5)
8. **Pruebas y optimización** (Fase 6)
9. **Documentación** (Fase 7)

---

## 🛠️ Tecnologías y Dependencias

### Nuevas Dependencias
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "langchain": "^0.1.0",
    "@langchain/postgres": "^0.0.1"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

### Servicios Externos
- **PostgreSQL** con **pgvector**
- **Text Generation WebUI** (embeddings)

---

## 📁 Estructura de Archivos Final

```
src/
├── app/
│   └── api/
│       ├── embeddings/
│       │   ├── create/route.ts
│       │   ├── batch/route.ts
│       │   └── [id]/route.ts
│       ├── search/
│       │   ├── vector/route.ts
│       │   └── hybrid/route.ts
│       └── record/
│           ├── add/route.ts
│           └── [namespace]/route.ts
├── components/
│   └── dashboard/
│       └── embeddings/
│           ├── EmbeddingsTab.tsx
│           ├── DocumentList.tsx
│           ├── DocumentForm.tsx
│           ├── DocumentCard.tsx
│           ├── SearchPanel.tsx
│           ├── SearchResults.tsx
│           ├── RecordManagerList.tsx
│           ├── RecordManagerForm.tsx
│           ├── RecordManagerCard.tsx
│           ├── EmbeddingStats.tsx
│           └── SimilarityChart.tsx
└── lib/
    ├── embeddings/
    │   ├── client.ts
    │   ├── types.ts
    │   ├── search.ts
    │   ├── record-manager.ts
    │   ├── triggers.ts
    │   ├── auto-embed.ts
    │   └── context-retrieval.ts
    └── chat/
        ├── router.ts (modificado)
        └── prompt-builder.ts (modificado)
```

---

## ⚠️ Consideraciones Importantes

1. **Dimensión del Vector:** Debe coincidir con el modelo de embeddings
2. **Rate Limiting:** Text Generation WebUI puede tener límites
3. **Indexación:** Usar índices HNSW para mejor performance
4. **Context Window:** Limitar el contexto recuperado para no exceder el modelo
5. **Actualizaciones:** Re-embed cuando cambie el documento
6. **Namespaces:** Usar namespaces para separar contextos (ej: world_id, npc_id)
7. **Backup:** Hacer backup regular de PostgreSQL

---

## 🚀 Próximos Pasos

¿Por dónde quieres empezar? Recomiendo:

1. **Fase 1 completa** - Configurar PostgreSQL con pgvector
2. **Fase 2 completa** - Probar Text Generation WebUI
3. **MVP mínimo** - API básica + UI básica
4. **Luego** - Funcionalidades avanzadas (Record Manager, triggers)

---

## 💡 Notas Adicionales

- El sistema será similar al de Flowise usando LangChain con Postgres
- Usaremos pgvector para almacenamiento y búsqueda vectorial
- Record Manager usará namespaces para organizar documentos
- Los triggers se integrarán con el sistema existente de triggers
- Todo será compatible con el router de chat actual

/**
 * LanceDB Embeddings Database
 *
 * Sistema de embeddings vectoriales usando LanceDB
 * Corre directamente dentro del proceso Node.js
 * No requiere servicios externos ni configuración adicional
 */

// Importación dinámica de LanceDB para evitar problemas con Next.js Turbopack
let lancedbModule: any = null;

async function getLancedb() {
  if (!lancedbModule) {
    try {
      // Importación dinámica para evitar análisis estático de Next.js
      const module = await import("@lancedb/lancedb");
      lancedbModule = module;
    } catch (error) {
      console.error('Error loading LanceDB:', error);
      throw new Error('No se pudo cargar el módulo de LanceDB. Asegúrate de que los paquetes nativos estén instalados correctamente.');
    }
  }
  return lancedbModule;
}

import { getEmbeddingClient } from './client';
import type { EmbeddingConfig } from './types';

interface EmbeddingRecord {
  id: string;
  vector: number[];
  content: string;
  source_type: string;
  source_id: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

interface SearchResult {
  id: string;
  content: string;
  source_type: string;
  source_id: string;
  metadata: Record<string, any>;
  score: number;
  created_at: string;
}

interface NamespaceRecord {
  id: string;
  namespace: string;
  description?: string;
  metadata?: Record<string, any>;
  embedding_count: number;
  created_at: string;
  updated_at: string;
}

interface EmbeddingStats {
  total_embeddings: number;
  total_namespaces: number;
  unique_sources: number;
  storage_size_mb?: number;
}

// Configuración
const DB_PATH = process.env.LANCEDB_PATH || "./data/embeddings";
const DEFAULT_DIMENSION = 768; // Ollama por defecto
const DEFAULT_NAMESPACE = "default";

let dbInstance: any = null;
let embeddingsTable: any = null;

/**
 * Conecta a LanceDB y crea las tablas necesarias
 */
async function connectToLanceDB(): Promise<{ db: any; table: any }> {
  if (!dbInstance || !embeddingsTable) {
    console.log('📦 Conectando a LanceDB:', DB_PATH);

    // Conectar a LanceDB (crea la base de datos si no existe)
    const lancedb = await getLancedb();
    dbInstance = await lancedb.connect(DB_PATH);

    // Definir esquema de la tabla de embeddings
    const schema = [
      { name: "id", type: "string" },
      { name: "vector", type: "float32", dim: DEFAULT_DIMENSION },
      { name: "content", type: "string" },
      { name: "source_type", type: "string" },
      { name: "source_id", type: "string" },
      { name: "metadata", type: "string" }, // Guardar como JSON string
      { name: "created_at", type: "string" },
      { name: "updated_at", type: "string" },
      { name: "namespace", type: "string" },
    ];

    // Crear tabla de embeddings si no existe
    try {
      embeddingsTable = await dbInstance.openTable("embeddings", schema);
      console.log('✅ Tabla de embeddings lista');
    } catch (error) {
      console.log('ℹ️  Creando nueva tabla de embeddings...');
      embeddingsTable = await dbInstance.createTable("embeddings", schema);
      console.log('✅ Tabla de embeddings creada');
    }
  }

  return { db: dbInstance, table: embeddingsTable };
}

/**
 * Verifica la conexión con LanceDB
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await connectToLanceDB();
    return true;
  } catch (error) {
    console.error('Error al conectar a LanceDB:', error);
    return false;
  }
}

/**
 * Crea un nuevo embedding
 */
export async function createEmbedding(params: {
  content: string;
  source_type: string;
  source_id: string;
  namespace?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { table } = await connectToLanceDB();

  try {
    // Generar embedding usando el cliente existente (Ollama o TextGen)
    const embeddingClient = getEmbeddingClient();
    const vector = await embeddingClient.embedText(params.content);

    // Generar ID único
    const id = `${params.source_type}-${params.source_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear registro
    const record: EmbeddingRecord = {
      id,
      vector,
      content: params.content,
      source_type: params.source_type,
      source_id: params.source_id,
      namespace: params.namespace || DEFAULT_NAMESPACE,
      metadata: JSON.stringify(params.metadata || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insertar en LanceDB
    await table.add([record]);

    console.log(`✅ Embedding creado: ${id} (${params.source_type}:${params.source_id})`);

    return id;
  } catch (error) {
    console.error('Error al crear embedding:', error);
    throw error;
  }
}

/**
 * Crea múltiples embeddings en batch
 */
export async function createBatchEmbeddings(
  items: {
    content: string;
    source_type: string;
    source_id: string;
    namespace?: string;
    metadata?: Record<string, any>;
  }[]
): Promise<string[]> {
  if (items.length === 0) {
    throw new Error('No hay items para procesar');
  }

  console.log(`📦 Procesando ${items.length} embeddings en batch con LanceDB...`);

  const { table } = await connectToLanceDB();

  try {
    // Generar embeddings vectoriales
    const embeddingClient = getEmbeddingClient();
    const texts = items.map(item => item.content);
    const vectors = await embeddingClient.embedBatch(texts);

    // Crear registros
    const records: EmbeddingRecord[] = items.map((item, index) => ({
      id: `${item.source_type}-${item.source_id}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      vector: vectors[index],
      content: item.content,
      source_type: item.source_type,
      source_id: item.source_id,
      namespace: item.namespace || DEFAULT_NAMESPACE,
      metadata: JSON.stringify(item.metadata || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insertar en batch
    await table.add(records);

    const ids = records.map(r => r.id);
    console.log(`✅ ${ids.length} embeddings creados exitosamente`);

    return ids;
  } catch (error) {
    console.error('Error al crear embeddings en batch:', error);
    throw error;
  }
}

/**
 * Busca embeddings similares
 */
export async function searchSimilar(params: {
  query?: string;
  queryVector?: number[];
  namespace?: string;
  limit?: number;
  threshold?: number;
  source_type?: string;
}): Promise<SearchResult[]> {
  const { table } = await connectToLanceDB();

  try {
    let vector: number[];

    if (queryVector) {
      vector = queryVector;
    } else if (params.query) {
      // Generar vector desde la query
      const embeddingClient = getEmbeddingClient();
      vector = await embeddingClient.embedText(params.query);
    } else {
      throw new Error('Debe proporcionar query o queryVector');
    }

    console.log(`🔍 Buscando embeddings similares para: ${params.query || 'vector directo'}`);

    // Realizar búsqueda vectorial con HNSW
    const results = await table
      .search(vector)
      .limit(params.limit || 10)
      .metricType("cosine") // Similitud coseno (método estándar para embeddings)
      .filter(params.source_type ? `(source_type = '${params.source_type}')` : undefined)
      .filter(params.namespace ? `(namespace = '${params.namespace}')` : undefined)
      .toArray();

    // Convertir a SearchResult
    const searchResults: SearchResult[] = results.map((r: any) => ({
      id: r.id,
      content: r.content,
      source_type: r.source_type,
      source_id: r.source_id,
      metadata: JSON.parse(r.metadata || '{}'),
      score: 1 - r._distance, // Convertir distancia a similitud (0-1)
      created_at: r.created_at,
    }));

    // Filtrar por threshold si se especifica
    if (params.threshold) {
      return searchResults.filter(r => r.score >= params.threshold!);
    }

    return searchResults;
  } catch (error) {
    console.error('Error al buscar embeddings similares:', error);
    throw error;
  }
}

/**
 * Busca embeddings dentro de un namespace específico
 */
export async function searchInNamespace(params: {
  namespace: string;
  query: string;
  limit?: number;
  threshold?: number;
}): Promise<SearchResult[]> {
  return searchSimilar({
    ...params,
    namespace: params.namespace,
  });
}

/**
 * Obtiene un embedding por ID
 */
export async function getEmbeddingById(id: string): Promise<EmbeddingRecord | null> {
  const { table } = await connectToLanceDB();

  try {
    const results = await table
      .filter(`id = '${id}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return null;
    }

    const record = results[0];
    return {
      id: record.id,
      vector: record.vector,
      content: record.content,
      source_type: record.source_type,
      source_id: record.source_id,
      metadata: JSON.parse(record.metadata || '{}'),
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  } catch (error) {
    console.error('Error al obtener embedding:', error);
    return null;
  }
}

/**
 * Elimina un embedding por ID
 */
export async function deleteEmbedding(id: string): Promise<boolean> {
  const { table } = await connectToLanceDB();

  try {
    await table.delete(`id = '${id}'`);
    console.log(`🗑️  Embedding eliminado: ${id}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar embedding:', error);
    return false;
  }
}

/**
 * Elimina todos los embeddings de una fuente
 */
export async function deleteBySource(source_type: string, source_id: string): Promise<number> {
  const { table } = await connectToLanceDB();

  try {
    console.log(`🗑️  Eliminando embeddings para ${source_type}:${source_id}`);

    // Primero contar cuántos hay
    const countResults = await table
      .filter(`source_type = '${source_type}' AND source_id = '${source_id}'`)
      .toArray();

    const count = countResults.length;

    if (count === 0) {
      return 0;
    }

    // Eliminar
    await table.delete(`source_type = '${source_type}' AND source_id = '${source_id}'`);

    console.log(`✅ ${count} embeddings eliminados`);

    return count;
  } catch (error) {
    console.error('Error al eliminar embeddings por fuente:', error);
    return 0;
  }
}

/**
 * Actualiza un embedding existente
 */
export async function updateEmbedding(
  id: string,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  const { table } = await connectToLanceDB();

  try {
    // Generar nuevo vector
    const embeddingClient = getEmbeddingClient();
    const vector = await embeddingClient.embedText(content);

    // Primero obtener el embedding existente
    const existing = await getEmbeddingById(id);
    if (!existing) {
      throw new Error(`Embedding ${id} no encontrado`);
    }

    // Crear registro actualizado
    const updatedRecord: EmbeddingRecord = {
      ...existing,
      vector,
      content,
      metadata: JSON.stringify(metadata || {}),
      updated_at: new Date().toISOString(),
    };

    // Eliminar el antiguo y crear el nuevo (LanceDB no soporta UPDATE directo)
    await table.delete(`id = '${id}'`);
    await table.add([updatedRecord]);

    console.log(`✅ Embedding actualizado: ${id}`);
  } catch (error) {
    console.error('Error al actualizar embedding:', error);
    throw error;
  }
}

// ========== Métodos de Namespace ==========

/**
 * Obtiene todos los embeddings de un namespace
 */
export async function getNamespaceEmbeddings(
  namespace: string,
  limit: number = 100
): Promise<EmbeddingRecord[]> {
  const { table } = await connectToLanceDB();

  try {
    const results = await table
      .filter(`namespace = '${namespace}'`)
      .limit(limit)
      .toArray();

    return results.map((r: any) => ({
      id: r.id,
      vector: r.vector,
      content: r.content,
      source_type: r.source_type,
      source_id: r.source_id,
      metadata: JSON.parse(r.metadata || '{}'),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (error) {
    console.error('Error al obtener embeddings del namespace:', error);
    return [];
  }
}

/**
 * Agrega un embedding existente a un namespace
 */
export async function addEmbeddingToNamespace(
  namespace: string,
  embeddingId: string
): Promise<void> {
  const { table } = await connectToLanceDB();

  try {
    // LanceDB no soporta actualizar un solo campo, así que obtenemos el embedding completo
    const existing = await getEmbeddingById(embeddingId);
    if (!existing) {
      throw new Error(`Embedding ${embeddingId} no encontrado`);
    }

    // Actualizar el namespace
    const updatedRecord: EmbeddingRecord = {
      ...existing,
      namespace,
      updated_at: new Date().toISOString(),
    };

    await table.delete(`id = '${embeddingId}'`);
    await table.add([updatedRecord]);

    console.log(`✅ Embedding ${embeddingId} agregado al namespace ${namespace}`);
  } catch (error) {
    console.error('Error al agregar embedding a namespace:', error);
    throw error;
  }
}

/**
 * Crea o actualiza un namespace
 */
export async function upsertNamespace(params: {
  namespace: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<NamespaceRecord> {
  // En LanceDB, los namespaces son parte de los embeddings
  // No necesitamos una tabla separada
  console.log(`ℹ️  Namespace upsert: ${params.namespace}`);

  return {
    id: `ns-${params.namespace}`,
    namespace: params.namespace,
    description: params.description,
    metadata: params.metadata,
    embedding_count: 0, // Se puede calcular si es necesario
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Obtiene todos los namespaces
 */
export async function getAllNamespaces(): Promise<NamespaceRecord[]> {
  const { table } = await connectToLanceDB();

  try {
    // Obtener todos los embeddings y agrupar por namespace
    const results = await table.toArray();

    const namespaceMap = new Map<string, NamespaceRecord>();

    results.forEach((r: any) => {
      const namespace = r.namespace || DEFAULT_NAMESPACE;

      if (!namespaceMap.has(namespace)) {
        namespaceMap.set(namespace, {
          id: `ns-${namespace}`,
          namespace,
          embedding_count: 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
        });
      }

      // Incrementar contador
      const ns = namespaceMap.get(namespace)!;
      ns.embedding_count++;
      if (r.updated_at > ns.updated_at) {
        ns.updated_at = r.updated_at;
      }
    });

    return Array.from(namespaceMap.values());
  } catch (error) {
    console.error('Error al obtener namespaces:', error);
    return [];
  }
}

/**
 * Elimina un namespace completo
 */
export async function deleteNamespace(namespace: string): Promise<boolean> {
  const { table } = await connectToLanceDB();

  try {
    console.log(`🗑️  Eliminando namespace: ${namespace}`);

    await table.delete(`namespace = '${namespace}'`);

    console.log(`✅ Namespace ${namespace} eliminado`);
    return true;
  } catch (error) {
    console.error('Error al eliminar namespace:', error);
    return false;
  }
}

// ========== Métodos de Utilidad ==========

/**
 * Obtiene estadísticas del sistema
 */
export async function getStats(): Promise<EmbeddingStats> {
  const { table } = await connectToLanceDB();

  try {
    const results = await table.toArray();

    const total_embeddings = results.length;
    const unique_sources = new Set(results.map((r: any) => `${r.source_type}:${r.source_id}`)).size;
    const namespaces = new Set(results.map((r: any) => r.namespace || DEFAULT_NAMESPACE)).size;

    return {
      total_embeddings,
      total_namespaces: namespaces,
      unique_sources: unique_sources,
      // storage_size_mb: LanceDB maneja esto internamente, no fácil de obtener
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      total_embeddings: 0,
      total_namespaces: 0,
      unique_sources: 0,
    };
  }
}

/**
 * Limpia todos los embeddings (PELIGROSO)
 */
export async function clearAll(): Promise<void> {
  try {
    console.log('⚠️  Limpiando todos los embeddings...');
    dbInstance = null;
    embeddingsTable = null;
    console.log('✅ Base de datos limpiada');
  } catch (error) {
    console.error('Error al limpiar base de datos:', error);
    throw error;
  }
}

// ========== Exportar instancia ==========

export const LanceEmbeddingsDB = {
  checkConnection,
  createEmbedding,
  createBatchEmbeddings,
  searchSimilar,
  searchInNamespace,
  getEmbeddingById,
  deleteEmbedding,
  deleteBySource,
  updateEmbedding,
  getNamespaceEmbeddings,
  addEmbeddingToNamespace,
  upsertNamespace,
  getAllNamespaces,
  deleteNamespace,
  getStats,
  clearAll,
};

export default LanceEmbeddingsDB;

/**
 * Cliente LanceDB para Sistema de Embeddings
 *
 * Maneja todas las operaciones con LanceDB para embeddings
 * usando búsqueda vectorial nativa
 */

import * as lancedb from '@lancedb/lancedb';
import { v4 as uuidv4 } from 'uuid';

// Configuración por defecto
const DEFAULT_URI = process.env.LANCEDB_URI || './data/lancedb';
const EMBEDDINGS_TABLE = 'embeddings';
const NAMESPACES_TABLE = 'namespaces';

let db: lancedb.Connection | null = null;
let embeddingsTable: lancedb.Table<any> | null = null;
let namespacesTable: lancedb.Table<any> | null = null;
let isInitialized = false;

/**
 * Inicializa la conexión a LanceDB (solo la primera vez)
 */
export async function initLanceDB(uri: string = DEFAULT_URI): Promise<void> {
  if (isInitialized && db) {
    console.log('ℹ️  LanceDB ya está inicializado');
    return;
  }

  isInitialized = true;

  try {
    db = await lancedb.connect(uri);
    console.log('✅ LanceDB conectado:', uri);

    // Abrir tabla de embeddings (crear si no existe)
    try {
      embeddingsTable = await db.openTable(EMBEDDINGS_TABLE);
      console.log('✅ Tabla embeddings abierta');
    } catch (error) {
      console.log('ℹ️  Tabla embeddings no existe, creando...');
      // Crear tabla de embeddings vacía
      embeddingsTable = await db.createTable(EMBEDDINGS_TABLE, []);
      console.log('✅ Tabla embeddings creada');
    }

    // Abrir tabla de namespaces (crear si no existe)
    try {
      namespacesTable = await db.openTable(NAMESPACES_TABLE);
      console.log('✅ Tabla namespaces abierta');
    } catch (error) {
      console.log('ℹ️  Tabla namespaces no existe, creando...');
      namespacesTable = await db.createTable(NAMESPACES_TABLE, []);
      console.log('✅ Tabla namespaces creada');
    }
  } catch (error) {
    console.error('❌ Error al inicializar LanceDB:', error);
    isInitialized = false;
    throw error;
  }
}

/**
 * Obtiene la tabla de embeddings
 */
export async function getEmbeddingsTable(): Promise<lancedb.Table<any>> {
  if (!db || !isInitialized) {
    await initLanceDB();
  }
  return embeddingsTable!;
}

/**
 * Obtiene la tabla de namespaces
 */
export async function getNamespacesTable(): Promise<lancedb.Table<any>> {
  if (!db || !isInitialized) {
    await initLanceDB();
  }
  return namespacesTable!;
}

/**
 * Obtiene la conexión a LanceDB
 */
export function getDB(): lancedb.Connection | null {
  return db;
}

/**
 * Cierra la conexión a LanceDB
 */
export async function closeLanceDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    embeddingsTable = null;
    namespacesTable = null;
    console.log('✅ LanceDB cerrado');
  }
}

/**
 * Interfaz para Embedding
 */
export interface Embedding {
  id: string;
  content: string;
  vector?: number[];
  metadata: Record<string, any>;
  namespace: string;
  source_type?: string;
  source_id?: string;
  model_name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interfaz para Resultado de Búsqueda
 */
export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  namespace: string;
  source_type?: string;
  source_id?: string;
  similarity: number;
}

/**
 * Interfaz para Record Namespace
 */
export interface RecordNamespace {
  id: string;
  namespace: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Clase principal del cliente de LanceDB
 */
export class LanceDBWrapper {
  /**
   * Verifica la conexión a LanceDB
   */
  static async checkConnection(): Promise<boolean> {
    try {
      if (!db) {
        await initLanceDB();
      }
      return db !== null;
    } catch (error) {
      console.error('Error al conectar a LanceDB:', error);
      return false;
    }
  }

  /**
   * Inserta un nuevo embedding
   */
  static async insertEmbedding(params: {
    content: string;
    vector: number[];
    metadata?: Record<string, any>;
    namespace?: string;
    source_type?: string;
    source_id?: string;
    model_name?: string;
  }): Promise<string> {
    const {
      content,
      vector,
      metadata = {},
      namespace = 'default',
      source_type,
      source_id,
      model_name = process.env.EMBEDDING_MODEL || 'nomic-embed-text'
    } = params;

    try {
      const table = await getEmbeddingsTable();

      const embedding = {
        id: uuidv4(),
        content,
        vector,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          source_type,
          source_id
        },
        namespace,
        source_type,
        source_id,
        model_name,
        created_at: new Date(),
        updated_at: new Date()
      };

      await table.add([embedding]);
      console.log(`✅ Embedding insertado en LanceDB: ${embedding.id}`);
      return embedding.id;
    } catch (error) {
      console.error('Error al insertar embedding:', error);
      throw error;
    }
  }

  /**
   * Busca embeddings similares
   */
  static async searchSimilar(params: {
    queryVector: number[];
    namespace?: string;
    limit?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const {
      queryVector,
      namespace,
      limit = 10,
      threshold = parseFloat(process.env.DEFAULT_SIMILARITY_THRESHOLD || '0.7')
    } = params;

    try {
      const table = await getEmbeddingsTable();

      let results: any[];

      if (namespace && namespace !== 'default') {
        // Buscar en tabla específica del namespace
        try {
          const namespaceTable = await db!.openTable(namespace);
          const searchResults = await namespaceTable
            .search(queryVector)
            .limit(limit)
            .execute();

          // Convertir distancia a similitud (1 - distancia)
          results = searchResults.map(row => ({
            ...row,
            similarity: 1 - (row._distance || 0)
          })).filter((r: any) => r.similarity >= threshold);
        } catch (error) {
          console.log(`ℹ️  Tabla de namespace "${namespace}" no existe`);
          results = [];
        }
      } else {
        // Buscar en tabla principal filtrando por namespace
        const allResults = await table
          .search(queryVector)
          .limit(limit * 10) // Buscar más para filtrar
          .execute();

        // Filtrar por namespace y threshold
        results = allResults
          .map((row: any) => ({
            ...row,
            similarity: 1 - (row._distance || 0)
          }))
          .filter((r: any) =>
            (r.namespace || 'default') === namespace &&
            r.similarity >= threshold
          )
          .slice(0, limit);
      }

      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || 'default',
        source_type: row.source_type,
        source_id: row.source_id,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error('Error al buscar embeddings similares:', error);
      throw error;
    }
  }

  /**
   * Obtiene un embedding por ID
   */
  static async getEmbeddingById(id: string): Promise<Embedding | null> {
    try {
      const table = await getEmbeddingsTable();

      const results = await table.filter(`id = '${id}'`).execute();

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || 'default',
        source_type: row.source_type,
        source_id: row.source_id,
        model_name: row.model_name,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error al obtener embedding:', error);
      throw error;
    }
  }

  /**
   * Elimina un embedding por ID
   */
  static async deleteEmbedding(id: string): Promise<boolean> {
    try {
      const table = await getEmbeddingsTable();
      await table.delete(`id = '${id}'`);
      console.log(`✅ Embedding eliminado: ${id}`);
      return true;
    } catch (error) {
      console.error('Error al eliminar embedding:', error);
      throw error;
    }
  }

  /**
   * Elimina embeddings por source (tipo e ID)
   */
  static async deleteBySource(source_type: string, source_id: string): Promise<number> {
    try {
      const table = await getEmbeddingsTable();
      await table.delete(`source_type = '${source_type}' AND source_id = '${source_id}'`);
      console.log(`✅ Embeddings eliminados para ${source_type}:${source_id}`);
      return 1; // LanceDB no retorna conteo
    } catch (error) {
      console.error('Error al eliminar embeddings por source:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza un namespace (como tabla separada)
   */
  static async upsertNamespace(params: {
    namespace: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<RecordNamespace> {
    const { namespace, description, metadata = {} } = params;

    try {
      const table = await getNamespacesTable();

      // Verificar si namespace existe
      const existing = await table.filter(`namespace = '${namespace}'`).execute();

      const nsRecord = {
        id: uuidv4(),
        namespace,
        description,
        metadata: JSON.stringify(metadata),
        created_at: existing.length > 0 ? existing[0].created_at : new Date(),
        updated_at: new Date()
      };

      if (existing.length > 0) {
        // Actualizar
        await table.delete(`namespace = '${namespace}'`);
        await table.add([nsRecord]);
        console.log(`✅ Namespace actualizado: ${namespace}`);
      } else {
        // Crear
        await table.add([nsRecord]);
        console.log(`✅ Namespace creado: ${namespace}`);

        // Crear tabla separada para este namespace
        try {
          await db!.createTable(namespace, []);
          console.log(`✅ Tabla creada para namespace: ${namespace}`);
        } catch (tableError) {
          console.log(`ℹ️  Tabla "${namespace}" ya existe o error al crear:`, tableError);
        }
      }

      return {
        id: nsRecord.id,
        namespace: nsRecord.namespace,
        description: nsRecord.description,
        metadata: JSON.parse(nsRecord.metadata),
        created_at: nsRecord.created_at,
        updated_at: nsRecord.updated_at
      };
    } catch (error) {
      console.error('Error al upsert namespace:', error);
      throw error;
    }
  }

  /**
   * Agrega un embedding a un namespace (copia a tabla específica)
   */
  static async addEmbeddingToNamespace(namespace: string, embeddingId: string): Promise<void> {
    try {
      // Obtener embedding
      const embedding = await this.getEmbeddingById(embeddingId);
      if (!embedding) {
        throw new Error(`Embedding ${embeddingId} no encontrado`);
      }

      // Abrir tabla del namespace
      const namespaceTable = await db!.openTable(namespace);

      // Agregar a tabla del namespace
      await namespaceTable.add([{
        ...embedding,
        namespace
      }]);

      console.log(`✅ Embedding agregado a namespace ${namespace}: ${embeddingId}`);
    } catch (error) {
      console.error('Error al agregar embedding a namespace:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los embeddings de un namespace
   */
  static async getNamespaceEmbeddings(
    namespace: string,
    limit: number = 100
  ): Promise<Embedding[]> {
    try {
      // Buscar en tabla específica del namespace
      const namespaceTable = await db!.openTable(namespace);

      const results = await namespaceTable.limit(limit).execute();

      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        model_name: row.model_name,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error al obtener embeddings del namespace:', error);
      throw error;
    }
  }

  /**
   * Busca embeddings dentro de un namespace específico
   */
  static async searchInNamespace(params: {
    namespace: string;
    queryVector: number[];
    limit?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const { namespace, queryVector, limit = 10, threshold = 0.7 } = params;

    try {
      // Buscar en tabla específica del namespace
      const namespaceTable = await db!.openTable(namespace);

      const results = await namespaceTable
        .search(queryVector)
        .limit(limit)
        .execute();

      // Convertir distancia a similitud y filtrar por threshold
      const filteredResults = results
        .map((row: any) => ({
          ...row,
          similarity: 1 - (row._distance || 0)
        }))
        .filter((r: any) => r.similarity >= threshold);

      return filteredResults.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error('Error al buscar en namespace:', error);
      throw error;
    }
  }

  /**
   * Elimina un namespace completo (tabla y metadatos)
   */
  static async deleteNamespace(namespace: string): Promise<boolean> {
    try {
      // Eliminar de tabla de metadatos
      const table = await getNamespacesTable();
      await table.delete(`namespace = '${namespace}'`);

      // Eliminar tabla del namespace
      try {
        await db!.dropTable(namespace);
        console.log(`✅ Namespace eliminado: ${namespace}`);
        return true;
      } catch (error) {
        console.log(`ℹ️  Tabla "${namespace}" no existe`);
        return false;
      }
    } catch (error) {
      console.error('Error al eliminar namespace:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los namespaces
   */
  static async getAllNamespaces(): Promise<RecordNamespace[]> {
    try {
      const table = await getNamespacesTable();
      const results = await table.execute();

      return results.map((row: any) => ({
        id: row.id,
        namespace: row.namespace,
        description: row.description,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error al obtener namespaces:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de embeddings
   */
  static async getStats(): Promise<{
    totalEmbeddings: number;
    totalNamespaces: number;
    embeddingsByNamespace: Record<string, number>;
    embeddingsBySourceType: Record<string, number>;
  }> {
    try {
      const table = await getEmbeddingsTable();

      // Obtener todos los embeddings
      const allEmbeddings = await table.execute();

      const totalEmbeddings = allEmbeddings.length;

      // Obtener todos los namespaces
      const namespaces = await this.getAllNamespaces();
      const totalNamespaces = namespaces.length;

      // Contar embeddings por namespace
      const embeddingsByNamespace: Record<string, number> = {};
      allEmbeddings.forEach((row: any) => {
        const ns = row.namespace || 'default';
        embeddingsByNamespace[ns] = (embeddingsByNamespace[ns] || 0) + 1;
      });

      // Contar embeddings por source_type
      const embeddingsBySourceType: Record<string, number> = {};
      allEmbeddings.forEach((row: any) => {
        if (row.source_type) {
          embeddingsBySourceType[row.source_type] = (embeddingsBySourceType[row.source_type] || 0) + 1;
        }
      });

      return {
        totalEmbeddings,
        totalNamespaces,
        embeddingsByNamespace,
        embeddingsBySourceType
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

export default LanceDBWrapper;

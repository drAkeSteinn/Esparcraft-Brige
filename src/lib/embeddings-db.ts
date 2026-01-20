/**
 * Cliente PostgreSQL para Sistema de Embeddings
 *
 * Maneja todas las operaciones con la base de datos de embeddings
 * usando pgvector para búsqueda vectorial
 */

import pg from 'pg';

// Configuración de conexión por defecto (variables de entorno)
const defaultConfig = {
  host: process.env.EMBEDDINGS_DB_HOST || 'localhost',
  port: parseInt(process.env.EMBEDDINGS_DB_PORT) || '5432',
  database: process.env.EMBEDDINGS_DB_NAME || 'bridge_embeddings',
  user: process.env.EMBEDDINGS_DB_USER || 'postgres',
  password: process.env.EMBEDDINGS_DB_PASSWORD || 'postgres'
};

// Pool de conexiones con configuración por defecto
let pool = new pg.Pool({
  ...defaultConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

/**
 * Configura el pool de conexiones con nueva configuración
 */
export function configurePool(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): void {
  // Cerrar pool existente si hay uno
  pool.end().catch(err => console.error('Error cerrando pool:', err));

  // Crear nuevo pool con la configuración
  pool = new pg.Pool({
    ...config,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  console.log('✅ Pool de PostgreSQL reconfigurado con:', config.host);
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
 * Clase principal del cliente de embeddings
 */
export class EmbeddingsDB {
  /**
   * Obtiene el pool de conexiones
   */
  static getPool() {
    return pool;
  }

  /**
   * Cierra el pool de conexiones
   */
  static async close() {
    await pool.end();
  }

  /**
   * Verifica la conexión a la base de datos
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error);
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
      model_name = process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2'
    } = params;

    const client = await pool.connect();

    try {
      const vectorStr = `[${vector.join(',')}]`;

      const result = await client.query(
        `INSERT INTO embeddings (
          content,
          vector,
          metadata,
          namespace,
          source_type,
          source_id,
          model_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [content, vectorStr, JSON.stringify(metadata), namespace, source_type, source_id, model_name]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Error al insertar embedding:', error);
      throw error;
    } finally {
      client.release();
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

    const client = await pool.connect();

    try {
      const vectorStr = `[${queryVector.join(',')}]`;

      let query = `
        SELECT
          id,
          content,
          metadata,
          namespace,
          source_type,
          source_id,
          (1 - (vector <=> $1)) AS similarity
        FROM embeddings
        WHERE (1 - (vector <=> $1)) >= $2
      `;

      const params: any[] = [vectorStr, threshold];
      let paramIndex = 3;

      if (namespace) {
        query += ` AND namespace = $${paramIndex++}`;
        params.push(namespace);
      }

      query += ` ORDER BY vector <=> $1 LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await client.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('Error al buscar embeddings similares:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene un embedding por ID
   */
  static async getEmbeddingById(id: string): Promise<Embedding | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM embeddings WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        model_name: row.model_name,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error al obtener embedding:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un embedding por ID
   */
  static async deleteEmbedding(id: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM embeddings WHERE id = $1 RETURNING id',
        [id]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error al eliminar embedding:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina embeddings por source (tipo e ID)
   */
  static async deleteBySource(source_type: string, source_id: string): Promise<number> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM embeddings WHERE source_type = $1 AND source_id = $2 RETURNING id',
        [source_type, source_id]
      );

      return result.rows.length;
    } catch (error) {
      console.error('Error al eliminar embeddings por source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Crea o actualiza un namespace del Record Manager
   */
  static async upsertNamespace(params: {
    namespace: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<RecordNamespace> {
    const { namespace, description, metadata = {} } = params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO record_namespaces (namespace, description, metadata)
         VALUES ($1, $2, $3)
         ON CONFLICT (namespace)
         DO UPDATE SET
           description = COALESCE($2, record_namespaces.description),
           metadata = COALESCE($3, record_namespaces.metadata),
           updated_at = NOW()
         RETURNING *`,
        [namespace, description, JSON.stringify(metadata)]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        namespace: row.namespace,
        description: row.description,
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error al upsert namespace:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Agrega un embedding a un namespace
   */
  static async addEmbeddingToNamespace(namespace: string, embeddingId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query(
        `INSERT INTO record_embeddings (namespace_id, embedding_id)
         VALUES (
           (SELECT id FROM record_namespaces WHERE namespace = $1),
           $2
         )
         ON CONFLICT (namespace_id, embedding_id) DO NOTHING`,
        [namespace, embeddingId]
      );
    } catch (error) {
      console.error('Error al agregar embedding a namespace:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene todos los embeddings de un namespace
   */
  static async getNamespaceEmbeddings(
    namespace: string,
    limit: number = 100
  ): Promise<Embedding[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT e.*, re.added_at
         FROM record_embeddings re
         JOIN embeddings e ON e.id = re.embedding_id
         JOIN record_namespaces rn ON rn.id = re.namespace_id
         WHERE rn.namespace = $1
         ORDER BY re.added_at DESC
         LIMIT $2`,
        [namespace, limit]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        model_name: row.model_name,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('Error al obtener embeddings del namespace:', error);
      throw error;
    } finally {
      client.release();
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
    const client = await pool.connect();

    try {
      const vectorStr = `[${queryVector.join(',')}]`;

      const query = `
        SELECT
          e.id,
          e.content,
          e.metadata,
          e.namespace,
          e.source_type,
          e.source_id,
          (1 - (e.vector <=> $1)) AS similarity
        FROM record_embeddings re
        JOIN embeddings e ON e.id = re.embedding_id
        JOIN record_namespaces rn ON rn.id = re.namespace_id
        WHERE rn.namespace = $2
          AND (1 - (e.vector <=> $1)) >= $3
        ORDER BY e.vector <=> $1
        LIMIT $4
      `;

      const result = await client.query(query, [vectorStr, namespace, threshold, limit]);

      return result.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace,
        source_type: row.source_type,
        source_id: row.source_id,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('Error al buscar en namespace:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un namespace completo
   */
  static async deleteNamespace(namespace: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM record_namespaces WHERE namespace = $1 RETURNING id',
        [namespace]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error al eliminar namespace:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene todos los namespaces
   */
  static async getAllNamespaces(): Promise<RecordNamespace[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM record_namespaces ORDER BY created_at DESC'
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        namespace: row.namespace,
        description: row.description,
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('Error al obtener namespaces:', error);
      throw error;
    } finally {
      client.release();
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
    const client = await pool.connect();

    try {
      // Total de embeddings
      const totalResult = await client.query('SELECT COUNT(*) as count FROM embeddings');
      const totalEmbeddings = parseInt(totalResult.rows[0].count);

      // Total de namespaces
      const namespacesResult = await client.query('SELECT COUNT(*) as count FROM record_namespaces');
      const totalNamespaces = parseInt(namespacesResult.rows[0].count);

      // Embeddings por namespace
      const byNamespaceResult = await client.query(
        `SELECT namespace, COUNT(*) as count
         FROM embeddings
         GROUP BY namespace
         ORDER BY count DESC`
      );

      const embeddingsByNamespace: Record<string, number> = {};
      byNamespaceResult.rows.forEach((row: any) => {
        embeddingsByNamespace[row.namespace] = parseInt(row.count);
      });

      // Embeddings por source_type
      const byTypeResult = await client.query(
        `SELECT source_type, COUNT(*) as count
         FROM embeddings
         WHERE source_type IS NOT NULL
         GROUP BY source_type
         ORDER BY count DESC`
      );

      const embeddingsBySourceType: Record<string, number> = {};
      byTypeResult.rows.forEach((row: any) => {
        embeddingsBySourceType[row.source_type] = parseInt(row.count);
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
    } finally {
      client.release();
    }
  }
}

// Exportar instancia por defecto
export default EmbeddingsDB;

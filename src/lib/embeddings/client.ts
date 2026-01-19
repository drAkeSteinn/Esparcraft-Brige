/**
 * Cliente Unificado de Embeddings
 *
 * Combina Text Generation WebUI (para generar embeddings)
 * con la base de datos PostgreSQL (para almacenar y buscar)
 */

import { TextGenWebUIEmbeddingClient } from './text-gen-client';
import { EmbeddingsDB } from '../embeddings-db';
import type {
  CreateEmbeddingParams,
  SearchParams,
  SearchResult,
  RecordNamespace,
  EmbeddingStats,
  SourceType
} from './types';

/**
 * Cliente principal de embeddings que une generación y almacenamiento
 */
export class EmbeddingClient {
  private textGenClient: TextGenWebUIEmbeddingClient;
  private db = EmbeddingsDB;

  constructor() {
    this.textGenClient = new TextGenWebUIEmbeddingClient();
  }

  /**
   * Crea un nuevo embedding (genera vector y almacena)
   */
  async createEmbedding(params: CreateEmbeddingParams): Promise<string> {
    const { content, metadata = {}, namespace, source_type, source_id } = params;

    try {
      // 1. Generar el embedding vectorial
      const vector = await this.textGenClient.embedText(content);

      // 2. Guardar en la base de datos
      const embeddingId = await this.db.insertEmbedding({
        content,
        vector,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          source_type,
          source_id
        },
        namespace: namespace || 'default',
        source_type,
        source_id,
        model_name: this.textGenClient.getConfig().model
      });

      console.log(`✅ Embedding creado: ${embeddingId}`);
      return embeddingId;
    } catch (error) {
      console.error('Error al crear embedding:', error);
      throw error;
    }
  }

  /**
   * Crea múltiples embeddings en batch
   */
  async createBatchEmbeddings(
    items: CreateEmbeddingParams[],
    namespace?: string
  ): Promise<string[]> {
    if (items.length === 0) {
      throw new Error('No hay items para procesar');
    }

    console.log(`📦 Procesando ${items.length} embeddings en batch...`);

    try {
      // 1. Extraer textos y generar embeddings vectoriales
      const texts = items.map(item => item.content);
      const vectors = await this.textGenClient.embedBatch(texts);

      // 2. Guardar todos los embeddings en la base de datos
      const embeddingIds: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const vector = vectors[i];

        const embeddingId = await this.db.insertEmbedding({
          content: item.content,
          vector,
          metadata: {
            ...(item.metadata || {}),
            created_at: new Date().toISOString(),
            source_type: item.source_type,
            source_id: item.source_id
          },
          namespace: namespace || item.namespace || 'default',
          source_type: item.source_type,
          source_id: item.source_id,
          model_name: this.textGenClient.getConfig().model
        });

        embeddingIds.push(embeddingId);

        if ((i + 1) % 10 === 0) {
          console.log(`   Progreso: ${i + 1}/${items.length} embeddings creados`);
        }
      }

      console.log(`✅ ${embeddingIds.length} embeddings creados exitosamente`);
      return embeddingIds;
    } catch (error) {
      console.error('Error al crear embeddings en batch:', error);
      throw error;
    }
  }

  /**
   * Busca embeddings similares (por texto o vector)
   */
  async searchSimilar(params: SearchParams): Promise<SearchResult[]> {
    const { query, queryVector, namespace, limit, threshold, source_type, source_id } = params;

    try {
      let vector: number[];

      if (queryVector) {
        // Usar vector proporcionado
        vector = queryVector;
      } else if (query) {
        // Generar vector desde la query
        vector = await this.textGenClient.embedText(query);
      } else {
        throw new Error('Debe proporcionar query o queryVector');
      }

      // Buscar en la base de datos
      const results = await this.db.searchSimilar({
        queryVector: vector,
        namespace,
        limit: limit || 10,
        threshold: threshold || 0.7
      });

      // Filtrar por source_type si se proporciona
      let filteredResults = results;
      if (source_type) {
        filteredResults = filteredResults.filter(r => r.source_type === source_type);
      }

      // Filtrar por source_id si se proporciona
      if (source_id) {
        filteredResults = filteredResults.filter(r => r.source_id === source_id);
      }

      return filteredResults;
    } catch (error) {
      console.error('Error al buscar embeddings similares:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza un embedding y lo agrega a un namespace
   */
  async createAndAddToNamespace(params: {
    content: string;
    namespace: string;
    metadata?: Record<string, any>;
    source_type?: SourceType;
    source_id?: string;
  }): Promise<{ embeddingId: string; namespaceId: string }> {
    const { content, namespace, metadata, source_type, source_id } = params;

    try {
      // 1. Crear embedding
      const embeddingId = await this.createEmbedding({
        content,
        metadata,
        namespace,
        source_type,
        source_id
      });

      // 2. Agregar al namespace
      await this.db.addEmbeddingToNamespace(namespace, embeddingId);

      // 3. Obtener namespace info
      const namespaces = await this.db.getAllNamespaces();
      const ns = namespaces.find(n => n.namespace === namespace);

      return {
        embeddingId,
        namespaceId: ns?.id || ''
      };
    } catch (error) {
      console.error('Error al crear embedding y agregar a namespace:', error);
      throw error;
    }
  }

  /**
   * Obtiene un embedding por ID
   */
  async getEmbedding(id: string) {
    return this.db.getEmbeddingById(id);
  }

  /**
   * Elimina un embedding por ID
   */
  async deleteEmbedding(id: string): Promise<boolean> {
    return this.db.deleteEmbedding(id);
  }

  /**
   * Elimina todos los embeddings de una fuente
   */
  async deleteBySource(source_type: SourceType, source_id: string): Promise<number> {
    console.log(`🗑️  Eliminando embeddings para ${source_type}:${source_id}`);
    return this.db.deleteBySource(source_type, source_id);
  }

  /**
   * Actualiza un embedding existente
   */
  async updateEmbedding(
    id: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Generar nuevo vector
      const vector = await this.textGenClient.embedText(content);

      // 2. Actualizar en la base de datos
      const client = this.db.getPool().connect();

      try {
        await client.query(
          `UPDATE embeddings
           SET content = $1,
               vector = $2,
               metadata = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [content, `[${vector.join(',')}]`, JSON.stringify(metadata || {}), id]
        );
        console.log(`✅ Embedding actualizado: ${id}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error al actualizar embedding:', error);
      throw error;
    }
  }

  // ========== Métodos de Namespace ==========

  /**
   * Crea o actualiza un namespace
   */
  async upsertNamespace(params: {
    namespace: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<RecordNamespace> {
    return this.db.upsertNamespace(params);
  }

  /**
   * Agrega un embedding existente a un namespace
   */
  async addToNamespace(namespace: string, embeddingId: string): Promise<void> {
    return this.db.addEmbeddingToNamespace(namespace, embeddingId);
  }

  /**
   * Obtiene todos los embeddings de un namespace
   */
  async getNamespaceEmbeddings(namespace: string, limit: number = 100) {
    return this.db.getNamespaceEmbeddings(namespace, limit);
  }

  /**
   * Busca embeddings dentro de un namespace específico
   */
  async searchInNamespace(params: {
    namespace: string;
    query: string;
    limit?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const { namespace, query, limit, threshold } = params;

    // Generar vector de la query
    const vector = await this.textGenClient.embedText(query);

    // Buscar en el namespace
    return this.db.searchInNamespace({
      namespace,
      queryVector: vector,
      limit: limit || 10,
      threshold: threshold || 0.7
    });
  }

  /**
   * Elimina un namespace completo
   */
  async deleteNamespace(namespace: string): Promise<boolean> {
    console.log(`🗑️  Eliminando namespace: ${namespace}`);
    return this.db.deleteNamespace(namespace);
  }

  /**
   * Obtiene todos los namespaces
   */
  async getAllNamespaces(): Promise<RecordNamespace[]> {
    return this.db.getAllNamespaces();
  }

  // ========== Métodos de Utilidad ==========

  /**
   * Verifica conexiones
   */
  async checkConnections(): Promise<{
    db: boolean;
    textGen: boolean;
  }> {
    const [db, textGen] = await Promise.all([
      EmbeddingsDB.checkConnection(),
      this.textGenClient.checkConnection()
    ]);

    return { db, textGen };
  }

  /**
   * Obtiene estadísticas del sistema
   */
  async getStats(): Promise<EmbeddingStats> {
    return this.db.getStats();
  }

  /**
   * Cierra todas las conexiones
   */
  async close(): Promise<void> {
    await EmbeddingsDB.close();
  }
}

// Exportar instancia singleton
let embeddingClientInstance: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  if (!embeddingClientInstance) {
    embeddingClientInstance = new EmbeddingClient();
  }
  return embeddingClientInstance;
}

export default EmbeddingClient;

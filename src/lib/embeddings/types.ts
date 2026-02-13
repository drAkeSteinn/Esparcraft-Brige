/**
 * Tipos para el Sistema de Embeddings
 */

/**
 * Resultado de embedding de Text Generation WebUI
 */
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokens?: number;
}

/**
 * Resultado de embedding batch
 */
export interface EmbeddingBatchResponse {
  embeddings: number[][];
  model: string;
  total_tokens: number;
}

/**
 * Parámetros para crear embedding
 */
export interface CreateEmbeddingParams {
  content: string;
  metadata?: Record<string, any>;
  namespace?: string;
  source_type?: string;
  source_id?: string;
}

/**
 * Parámetros para crear embeddings en batch
 */
export interface CreateEmbeddingBatchParams {
  items: CreateEmbeddingParams[];
  namespace?: string;
}

/**
 * Parámetros para búsqueda vectorial
 */
export interface SearchParams {
  query: string;
  queryVector?: number[];
  namespace?: string;
  limit?: number;
  threshold?: number;
  source_type?: string;
  source_id?: string;
}

/**
 * Resultado de búsqueda
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
 * Namespace del Record Manager
 */
export interface RecordNamespace {
  id: string;
  namespace: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  embedding_count?: number;
}

/**
 * Parámetros para crear/updatear namespace
 */
export interface UpsertNamespaceParams {
  namespace: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Parámetros para agregar embedding a namespace
 */
export interface AddToNamespaceParams {
  namespace: string;
  embedding_id: string;
}

/**
 * Estadísticas de embeddings
 */
export interface EmbeddingStats {
  totalEmbeddings: number;
  totalNamespaces: number;
  embeddingsByNamespace: Record<string, number>;
  embeddingsBySourceType: Record<string, number>;
}

/**
 * Tipo de fuente para embeddings
 */
export type SourceType =
  | 'world'
  | 'pueblo'
  | 'edificio'
  | 'npc'
  | 'session'
  | 'custom';

/**
 * Error de embedding
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Configuración de embeddings (Ollama único)
 */
export interface EmbeddingConfig {
  ollamaUrl: string;
  model: string;
  dimension: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

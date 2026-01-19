/**
 * Cliente de Text Generation WebUI para Embeddings
 *
 * Se conecta a la API de embeddings de Text Generation WebUI
 * para generar vectores de embeddings para textos
 */

import type {
  EmbeddingResponse,
  EmbeddingBatchResponse,
  EmbeddingConfig,
  EmbeddingError
} from './types';

/**
 * Cliente para API de Embeddings de Text Generation WebUI
 */
export class TextGenWebUIEmbeddingClient {
  private config: EmbeddingConfig;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = {
      textGenWebUIUrl: process.env.TEXT_GEN_WEBUI_URL || 'http://localhost:5000',
      model: process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || '384'),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10'),
      timeout: 30000, // 30 segundos
      retryCount: 3,
      retryDelay: 1000, // 1 segundo
      ...config
    };
  }

  /**
   * Genera embedding para un solo texto
   */
  async embedText(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    return this.retryOperation(async () => {
      const response = await fetch(`${this.config.textGenWebUIUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: this.config.model
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new EmbeddingError(
          `Error del servidor Text Generation WebUI: ${response.status}`,
          'SERVER_ERROR',
          { status: response.status, text: errorText }
        );
      }

      const data: EmbeddingResponse = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new EmbeddingError(
          'Respuesta inválida del servidor',
          'INVALID_RESPONSE',
          data
        );
      }

      // Validar dimensión
      if (data.embedding.length !== this.config.dimension) {
        console.warn(
          `⚠️  Advertencia: El vector tiene ${data.embedding.length} dimensiones, ` +
          `pero se esperaban ${this.config.dimension}`
        );
      }

      return data.embedding;
    });
  }

  /**
   * Genera embeddings para múltiples textos (batch)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('No hay textos para procesar');
    }

    // Dividir en batches según el tamaño configurado
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchEmbeddings = await this.embedBatchSingle(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Genera embeddings para un batch de textos
   */
  private async embedBatchSingle(texts: string[]): Promise<number[][]> {
    return this.retryOperation(async () => {
      const response = await fetch(`${this.config.textGenWebUIUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: this.config.model
        }),
        signal: AbortSignal.timeout(this.config.timeout * texts.length)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new EmbeddingError(
          `Error del servidor Text Generation WebUI: ${response.status}`,
          'SERVER_ERROR',
          { status: response.status, text: errorText }
        );
      }

      const data: EmbeddingBatchResponse = await response.json();

      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new EmbeddingError(
          'Respuesta inválida del servidor',
          'INVALID_RESPONSE',
          data
        );
      }

      if (data.embeddings.length !== texts.length) {
        throw new EmbeddingError(
          `Se recibieron ${data.embeddings.length} embeddings, pero se enviaron ${texts.length} textos`,
          'BATCH_MISMATCH',
          { received: data.embeddings.length, sent: texts.length }
        );
      }

      // Validar dimensiones de cada embedding
      data.embeddings.forEach((embedding, index) => {
        if (embedding.length !== this.config.dimension) {
          console.warn(
            `⚠️  Advertencia: El embedding ${index} tiene ${embedding.length} dimensiones, ` +
            `pero se esperaban ${this.config.dimension}`
          );
        }
      });

      return data.embeddings;
    });
  }

  /**
   * Envuelve una operación con lógica de reintentos
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount: number = this.config.retryCount
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // No reintentar en ciertos errores
        if (error instanceof EmbeddingError) {
          if (
            error.code === 'INVALID_INPUT' ||
            error.code === 'AUTH_ERROR' ||
            error.code === 'PERMISSION_DENIED'
          ) {
            throw error;
          }
        }

        // Si es el último intento, lanzar el error
        if (attempt === retryCount) {
          break;
        }

        // Esperar antes de reintentar
        console.warn(
          `⚠️  Intento ${attempt + 1}/${retryCount + 1} falló. Reintentando en ${this.config.retryDelay}ms...`,
          error
        );

        await this.delay(this.config.retryDelay * (attempt + 1));
      }
    }

    throw lastError;
  }

  /**
   * Verifica la conexión con Text Generation WebUI
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.textGenWebUIUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'test',
          model: this.config.model
        }),
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Error al conectar con Text Generation WebUI:', error);
      return false;
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(updates: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Helper para esperar una cantidad de tiempo
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calcula similitud coseno entre dos vectores
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calcula distancia euclidiana entre dos vectores
   */
  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }
}

// Exportar instancia singleton
let textGenClientInstance: TextGenWebUIEmbeddingClient | null = null;

export function getTextGenClient(config?: Partial<EmbeddingConfig>): TextGenWebUIEmbeddingClient {
  if (!textGenClientInstance) {
    textGenClientInstance = new TextGenWebUIEmbeddingClient(config);
  } else if (config) {
    textGenClientInstance.updateConfig(config);
  }

  return textGenClientInstance;
}

export default TextGenWebUIEmbeddingClient;

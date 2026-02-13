/**
 * Cliente de Ollama para Embeddings
 *
 * Se conecta a la API de embeddings de Ollama
 * para generar vectores de embeddings para textos
 */

import type {
  EmbeddingResponse,
  EmbeddingBatchResponse,
  EmbeddingConfig,
  EmbeddingError
} from './types';

/**
 * Cliente para API de Embeddings de Ollama
 */
export class OllamaEmbeddingClient {
  private config: EmbeddingConfig;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = {
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || '768'),
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
      const response = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: text
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new EmbeddingError(
          `Error del servidor Ollama: ${response.status}`,
          'SERVER_ERROR',
          { status: response.status, text: errorText }
        );
      }

      const data: any = await response.json();

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
   * Ollama no soporta batch nativo, así que procesamos secuencialmente
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('No hay textos para procesar');
    }

    // Ollama no soporta batch nativo, procesamos uno por uno
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.embedText(texts[i]);
      allEmbeddings.push(embedding);

      if ((i + 1) % 5 === 0) {
        console.log(`   Progreso: ${i + 1}/${texts.length} embeddings creados`);
      }
    }

    return allEmbeddings;
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
   * Verifica la conexión con Ollama
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Error al conectar con Ollama:', error);
      return false;
    }
  }

  /**
   * Obtiene la lista de modelos disponibles en Ollama
   */
  async getAvailableModels(): Promise<{ name: string; size?: number; modified_at?: string }[]> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Error del servidor Ollama: ${response.status}`);
      }

      const data: any = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error al obtener modelos de Ollama:', error);
      return [];
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
let ollamaClientInstance: OllamaEmbeddingClient | null = null;

export function getOllamaClient(config?: Partial<EmbeddingConfig>): OllamaEmbeddingClient {
  if (!ollamaClientInstance) {
    ollamaClientInstance = new OllamaEmbeddingClient(config);
  } else if (config) {
    ollamaClientInstance.updateConfig(config);
  }

  return ollamaClientInstance;
}

export default OllamaEmbeddingClient;

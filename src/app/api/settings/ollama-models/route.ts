import { NextRequest, NextResponse } from 'next/server';
import { OllamaEmbeddingClient } from '@/lib/embeddings/ollama-client';

/**
 * Mapa de dimensiones conocidas para modelos de embeddings populares
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  // Modelos de embeddings
  'nomic-embed-text': 768,
  'nomic-embed-text:latest': 768,
  'bge-m3': 1024,
  'bge-m3:latest': 1024,
  'mxbai-embed-large': 1024,
  'mxbai-embed-large:latest': 1024,
  'all-minilm': 384,
  'all-minilm:latest': 384,
  'all-minilm:l6-v2': 384,
  'snowflake-arctic-embed': 1024,
  'snowflake-arctic-embed:latest': 1024,
  'snowflake-arctic-embed-l': 1024,
  'snowflake-arctic-embed-m': 768,
  'snowflake-arctic-embed-s': 384,
  'jina-embeddings-v2': 768,
  'jina-embeddings-v2:latest': 768,
  'jina-embeddings-v2-base-en': 768,
  'e5-large-v2': 1024,
  'e5-large-v2:latest': 1024,
  'e5-base-v2': 768,
  'e5-small-v2': 384,
  'multilingual-e5-large': 1024,
  'multilingual-e5-base': 768,
  'multilingual-e5-small': 384,
};

/**
 * Modelos conocidos por tipo
 */
const EMBEDDING_MODEL_PATTERNS = [
  'embed', 'e5', 'bge', 'minilm', 'jina', 'arctic-embed',
  'sentence', 'text-embedding', 'instructor'
];

/**
 * Determina si un modelo es de embeddings basándose en su nombre
 */
function isEmbeddingModel(modelName: string): boolean {
  const name = modelName.toLowerCase();
  return EMBEDDING_MODEL_PATTERNS.some(pattern => name.includes(pattern));
}

/**
 * Obtiene la dimensión conocida de un modelo o null si es desconocida
 */
function getKnownDimension(modelName: string): number | null {
  // Buscar coincidencia exacta primero
  if (MODEL_DIMENSIONS[modelName]) {
    return MODEL_DIMENSIONS[modelName];
  }
  
  // Buscar por nombre base (sin tag)
  const baseName = modelName.split(':')[0];
  if (MODEL_DIMENSIONS[baseName]) {
    return MODEL_DIMENSIONS[baseName];
  }
  
  // Buscar por patrón
  const name = modelName.toLowerCase();
  if (name.includes('nomic-embed')) return 768;
  if (name.includes('bge-m3')) return 1024;
  if (name.includes('mxbai-embed')) return 1024;
  if (name.includes('minilm')) return 384;
  if (name.includes('arctic-embed-l')) return 1024;
  if (name.includes('arctic-embed-m')) return 768;
  if (name.includes('arctic-embed-s')) return 384;
  if (name.includes('arctic-embed')) return 1024;
  if (name.includes('jina-embed')) return 768;
  if (name.includes('e5-large') || name.includes('multilingual-e5-large')) return 1024;
  if (name.includes('e5-base') || name.includes('multilingual-e5-base')) return 768;
  if (name.includes('e5-small') || name.includes('multilingual-e5-small')) return 384;
  
  return null;
}

/**
 * POST /api/settings/ollama-models
 * Obtiene TODOS los modelos disponibles en Ollama
 *
 * Body:
 * {
 *   ollamaUrl: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { ollamaUrl } = await request.json();

    if (!ollamaUrl || typeof ollamaUrl !== 'string') {
      return NextResponse.json(
        { error: 'ollamaUrl es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    console.log('Conectando a Ollama en:', ollamaUrl);

    const ollamaClient = new OllamaEmbeddingClient({
      ollamaUrl
    });

    // Verificar conexión básica
    const connected = await ollamaClient.checkConnection();
    if (!connected) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message: 'No se pudo conectar a Ollama. Verifica que esté ejecutándose.'
        }
      });
    }

    // Obtener lista de TODOS los modelos
    const models = await ollamaClient.getAvailableModels();
    const allModels = models || [];

    // Procesar cada modelo con información completa
    const processedModels = allModels.map((model: any) => {
      const modelName = model.name || model.model || 'unknown';
      const isEmbedding = isEmbeddingModel(modelName);
      const knownDimension = getKnownDimension(modelName);
      
      return {
        name: modelName,
        size: model.size || 0,
        sizeFormatted: model.size ? formatSize(model.size) : 'Unknown',
        modified_at: model.modified_at || model.modified || '',
        modifiedAtFormatted: model.modified_at ? formatTimeAgo(new Date(model.modified_at)) : 'Unknown',
        isEmbeddingModel: isEmbedding,
        knownDimension: knownDimension,
        details: model.details || null,
        // Categoría del modelo
        category: isEmbedding ? 'embedding' : 'chat',
      };
    });

    // Separar modelos por categoría
    const embeddingModels = processedModels.filter(m => m.isEmbeddingModel);
    const chatModels = processedModels.filter(m => !m.isEmbeddingModel);

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        message: `Se encontraron ${allModels.length} modelo(s) en Ollama`,
        // Todos los modelos procesados
        allModels: processedModels,
        // Modelos de embeddings (filtrados)
        embeddingModels: embeddingModels,
        // Modelos de chat/otros
        chatModels: chatModels,
        // Estadísticas
        stats: {
          total: allModels.length,
          embeddingCount: embeddingModels.length,
          chatCount: chatModels.length,
          embeddingModelsWithKnownDimension: embeddingModels.filter(m => m.knownDimension).length
        }
      }
    });
  } catch (error: any) {
    console.error('Error al obtener modelos de Ollama:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener modelos de Ollama'
      },
      { status: 500 }
    );
  }
}

/**
 * Formatea el tamaño en bytes a una cadena legible
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(2)} ${units[i]}`;
}

/**
 * Formatea una fecha a tiempo relativo
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays > 30) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? 's' : ''} atrás`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
  } else if (diffMins > 0) {
    return `${diffMins} minuto${diffMins > 1 ? 's' : ''} atrás`;
  } else {
    return 'ahora mismo';
  }
}

/**
 * GET /api/settings/ollama-models/dimensions
 * Retorna el mapa de dimensiones conocidas
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      modelDimensions: MODEL_DIMENSIONS,
      embeddingPatterns: EMBEDDING_MODEL_PATTERNS
    }
  });
}

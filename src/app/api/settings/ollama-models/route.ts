import { NextRequest, NextResponse } from 'next/server';
import { OllamaEmbeddingClient } from '@/lib/embeddings/ollama-client';

/**
 * POST /api/settings/ollama-models
 * Obtiene los modelos disponibles en Ollama
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

    // Primero, verificar conexión básica
    const connected = await ollamaClient.checkConnection();
    if (!connected) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message: 'No se pudo conectar a Ollama'
        }
      });
    }

    // Obtener lista de todos los modelos
    const models = await ollamaClient.getAvailableModels();
    const allModels = models || [];

    // Filtrar solo modelos de embeddings
    const embeddingModels = allModels.filter((model: any) =>
      model.name.toLowerCase().includes('embed')
    );

    const availableModels = embeddingModels.map((model: any) => ({
      name: model.name,
      size: model.size || 0,
      modified_at: model.modified_at || ''
    }));

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        message: 'Modelos de Ollama detectados exitosamente',
        embeddingModels: availableModels,
        allModels // Todos los modelos disponibles
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

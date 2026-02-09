import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/settings/ollama-models
 * Obtiene la lista de modelos disponibles en Ollama
 *
 * Body:
 * {
 *   ollamaUrl: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    if (!config.ollamaUrl) {
      return NextResponse.json(
        { error: 'ollamaUrl es requerido' },
        { status: 400 }
      );
    }

    const url = config.ollamaUrl.replace(/\/$/, '');

    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });

      if (!response.ok) {
        throw new Error(`Error del servidor Ollama: ${response.status}`);
      }

      const data = await response.json();

      // Filtrar solo modelos que soportan embeddings
      // Modelos típicos de embeddings en Ollama:
      // - nomic-embed-text (768 dims)
      // - mxbai-embed-large (1024 dims)
      // - llama2 (768 dims con configuración específica)
      const allModels = data.models || [];

      // Modelos conocidos de embeddings
      const embeddingModels = allModels.filter((model: any) => {
        const name = model.name?.toLowerCase();
        return name?.includes('embed') || name?.includes('nomic');
      });

      return NextResponse.json({
        success: true,
        data: {
          allModels: allModels.map((m: any) => ({
            name: m.name,
            size: m.size,
            modified_at: m.modified_at
          })),
          embeddingModels: embeddingModels.map((m: any) => ({
            name: m.name,
            size: m.size,
            modified_at: m.modified_at
          }))
        }
      });
    } catch (error: any) {
      let message = 'No se pudo conectar a Ollama';

      if (error.name === 'AbortError') {
        message = 'Tiempo de espera agotado. Verifica que Ollama esté ejecutándose.';
      } else if (error.cause?.code === 'ECONNREFUSED') {
        message = 'Conexión rechazada. Verifica la URL y puerto (default: 11434).';
      } else if (error.message?.includes('fetch failed')) {
        message = 'No se puede conectar. Verifica la URL y que el servicio esté activo.';
      }

      return NextResponse.json({
        success: false,
        data: {
          message,
          availableModels: []
        }
      });
    }
  } catch (error: any) {
    console.error('Error al obtener modelos de Ollama:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener modelos'
      },
      { status: 500 }
    );
  }
}

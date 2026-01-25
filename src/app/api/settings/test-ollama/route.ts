import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/settings/test-ollama
 * Prueba la conexión a Ollama (API de embeddings)
 *
 * Body:
 * {
 *   ollamaUrl: string,
 *   ollamaModel: string
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
      // Primero verificar que Ollama está corriendo
      const tagsResponse = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });

      if (!tagsResponse.ok) {
        throw new Error('Ollama no responde');
      }

      const tagsData = await tagsResponse.json();

      // Verificar si el modelo existe
      const models = tagsData.models || [];
      const modelExists = models.some((m: any) => m.name === config.ollamaModel);

      if (!modelExists && config.ollamaModel) {
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            message: `El modelo "${config.ollamaModel}" no está disponible. Modelos disponibles: ${models.map((m: any) => m.name).join(', ')}`,
            availableModels: models.map((m: any) => ({
              name: m.name,
              size: m.size,
              modified_at: m.modified_at
            }))
          }
        });
      }

      // Intentar hacer una petición de embedding de prueba
      const response = await fetch(`${url}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.ollamaModel || 'nomic-embed-text',
          prompt: 'test'
        }),
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('La respuesta no tiene el formato esperado');
      }

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          message: `Conexión exitosa. Modelo: ${config.ollamaModel}, Dimensiones: ${data.embedding?.length || 'N/A'}`,
          model_info: {
            model: config.ollamaModel,
            dimensions: data.embedding?.length
          },
          availableModels: models.map((m: any) => ({
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
        success: true,
        data: {
          connected: false,
          message,
          error: error.message
        }
      });
    }
  } catch (error: any) {
    console.error('Error al probar Ollama:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión'
      },
      { status: 500 }
    );
  }
}

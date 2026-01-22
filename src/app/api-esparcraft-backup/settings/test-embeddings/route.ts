import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/settings/test-embeddings
 * Prueba la conexión a Text Generation WebUI (API de embeddings)
 *
 * Body:
 * {
 *   textGenWebUIUrl: string,
 *   embeddingModel: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    if (!config.textGenWebUIUrl) {
      return NextResponse.json(
        { error: 'textGenWebUIUrl es requerido' },
        { status: 400 }
      );
    }

    const url = config.textGenWebUIUrl.replace(/\/$/, '');

    try {
      // Intentar hacer una petición de embedding de prueba
      const response = await fetch(`${url}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: 'test',
          model: config.embeddingModel || 'all-MiniLM-L6-v2'
        }),
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
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
          message: `Conexión exitosa. Modelo: ${config.embeddingModel}, Dimensiones: ${data.embedding?.length || 'N/A'}`,
          model_info: {
            model: config.embeddingModel,
            dimensions: data.embedding?.length
          }
        }
      });
    } catch (error: any) {
      let message = 'No se pudo conectar a Text Generation WebUI';
      
      if (error.name === 'AbortError') {
        message = 'Tiempo de espera agotado. Verifica que Text Gen WebUI esté ejecutándose.';
      } else if (error.cause?.code === 'ECONNREFUSED') {
        message = 'Conexión rechazada. Verifica la URL y puerto.';
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
    console.error('Error al probar embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión'
      },
      { status: 500 }
    );
  }
}

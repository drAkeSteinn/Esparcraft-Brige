import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/settings/test-llm
 * Prueba la conexión a la API LLM (OpenAI-compatible)
 *
 * Body:
 * {
 *   apiUrl: string,
 *   model: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    if (!config.apiUrl) {
      return NextResponse.json(
        { error: 'apiUrl es requerido' },
        { status: 400 }
      );
    }

    const url = config.apiUrl.replace(/\/$/, '');

    try {
      // Intentar hacer una petición de chat de prueba
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model || 'local-model',
          messages: [
            {
              role: 'user',
              content: 'Test'
            }
          ],
          max_tokens: 10,
          temperature: parseFloat(config.temperature || '0.7') || 0.7
        }),
        signal: AbortSignal.timeout(15000) // 15 segundos timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('La respuesta no tiene el formato esperado de OpenAI');
      }

      const message = data.choices[0]?.message?.content || '';
      const usage = data.usage || {};

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          message: `Conexión exitosa. Respuesta: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
          model_info: {
            model: data.model || config.model,
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0
          }
        }
      });
    } catch (error: any) {
      let message = 'No se pudo conectar a la API LLM';
      
      if (error.name === 'AbortError') {
        message = 'Tiempo de espera agotado. Verifica que el servidor LLM esté ejecutándose.';
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
    console.error('Error al probar LLM:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión'
      },
      { status: 500 }
    );
  }
}

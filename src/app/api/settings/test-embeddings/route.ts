import { NextRequest, NextResponse } from 'next/server';
import { OllamaEmbeddingClient } from '@/lib/embeddings/ollama-client';

/**
 * POST /api/settings/test-embeddings
 * Prueba la conexión a Ollama y genera un embedding de prueba
 *
 * Body:
 * {
 *   ollamaUrl: string,
 *   model: string,
 *   testText?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ollamaUrl, model, testText = 'This is a test embedding.' } = body;

    if (!ollamaUrl) {
      return NextResponse.json(
        { success: false, error: 'ollamaUrl es requerido' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'model es requerido' },
        { status: 400 }
      );
    }

    console.log(`🧪 Probando embedding con Ollama: ${model} en ${ollamaUrl}`);

    // Crear cliente de Ollama
    const client = new OllamaEmbeddingClient({
      ollamaUrl,
      model,
      timeout: 30000
    });

    // Verificar conexión primero
    const connected = await client.checkConnection();
    if (!connected) {
      return NextResponse.json({
        success: true,
        data: {
          success: false,
          connected: false,
          message: 'No se pudo conectar a Ollama. Verifica que esté ejecutándose.'
        }
      });
    }

    // Intentar generar un embedding de prueba
    try {
      const embedding = await client.embedText(testText);

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('El embedding generado está vacío o tiene un formato incorrecto');
      }

      console.log(`✅ Embedding de prueba generado: ${embedding.length} dimensiones`);

      return NextResponse.json({
        success: true,
        data: {
          success: true,
          connected: true,
          message: `Embedding generado exitosamente`,
          model: model,
          dimension: embedding.length,
          testText: testText,
          sampleValues: embedding.slice(0, 5).map(v => v.toFixed(4))
        }
      });
    } catch (embedError: any) {
      console.error('❌ Error generando embedding:', embedError);
      
      let errorMessage = embedError.message || 'Error desconocido';
      
      if (errorMessage.includes('not found') || errorMessage.includes('model not found')) {
        errorMessage = `El modelo "${model}" no está instalado en Ollama. Ejecuta: ollama pull ${model}`;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Tiempo de espera agotado. El modelo puede estar cargando.';
      } else if (errorMessage.includes('connection')) {
        errorMessage = 'Error de conexión con Ollama.';
      }

      return NextResponse.json({
        success: true,
        data: {
          success: false,
          connected: true,
          message: errorMessage,
          error: embedError.message,
          suggestion: `Intenta descargar el modelo con: ollama pull ${model}`
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

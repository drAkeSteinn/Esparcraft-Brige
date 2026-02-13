import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/settings/test-ollama
 * Prueba la conexión a Ollama
 *
 * Body:
 * {
 *   ollamaUrl: string
 *   ollamaModel: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { ollamaUrl, ollamaModel } = await request.json();

    if (!ollamaUrl || typeof ollamaUrl !== 'string') {
      return NextResponse.json(
        { error: 'ollamaUrl es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    if (!ollamaModel || typeof ollamaModel !== 'string') {
      return NextResponse.json(
        { error: 'ollamaModel es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    console.log('Probando conexión a Ollama:', { ollamaUrl, ollamaModel });

    // Ollama no tiene un endpoint directo de "test", usamos /api/tags
    const testUrl = `${ollamaUrl}/api/tags`;

    // 1. Probar conectividad básica
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        cache: 'no-store'  // Importante para asegurar respuesta actual
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Obtener modelos disponibles
        const data = await response.json();
        const allModels = data.models || [];

        // Filtrar modelos de embeddings (modelos que incluyen 'embed' en el nombre)
        const embeddingModels = allModels.filter((m: unknown) =>
          (m as { name: string }).name.toLowerCase().includes('embed')
        );

        // Obtener el modelo actual si está disponible
        const currentModel = embeddingModels.find((m: unknown) =>
          (m as { name: string }).name.toLowerCase() === ollamaModel.toLowerCase()
        );

        console.log(`✅ Ollama conectado exitosamente`);
        console.log(`📋 ${allModels.length} modelos totales, ${embeddingModels.length} modelos de embeddings`);

        return NextResponse.json({
          success: true,
          data: {
            connected: true,
            message: 'Conexión exitosa a Ollama',
            availableModels: embeddingModels,
            allModels,
            currentModel: currentModel ? (currentModel as { name: string }).name : null,
            modelInfo: currentModel ? {
              name: (currentModel as { name: string; size: number; modified_at: string; id: string }).name,
              size: (currentModel as { size: number }).size,
              modified_at: (currentModel as { modified_at: string }).modified_at,
              id: (currentModel as { id: string }).id
            } : null
          }
        });
      } else {
        throw new Error('Ollama no respondió correctamente');
      }
    } catch (error: unknown) {
      console.error('❌ Error al conectar con Ollama:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message: `No se pudo conectar a Ollama: ${errorMessage}`,
          availableModels: [],
          allModels: []
        }
      });
    }
  } catch (error: unknown) {
    console.error('❌ Error general:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

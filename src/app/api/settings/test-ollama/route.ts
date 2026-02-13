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
        const embeddingModels = allModels.filter((m: any) => m.name.toLowerCase().includes('embed'));
        
        // Obtener el modelo actual si está disponible
        const currentModel = embeddingModels.find((m: any) => m.name.toLowerCase() === ollamaModel.toLowerCase());

        console.log(`✅ Ollama conectado exitosamente`);
        console.log(`📋 ${allModels.length} modelos totales, ${embeddingModels.length} modelos de embeddings`);

        return NextResponse.json({
          success: true,
          data: {
            connected: true,
            message: 'Conexión exitosa a Ollama',
            availableModels: embeddingModels,
            allModels,
            currentModel: currentModel?.name || null,
            modelInfo: currentModel ? {
              name: currentModel.name,
              size: currentModel.size,
              modified_at: currentModel.modified_at,
              id: currentModel.id
            } : null
          }
        });
      } else {
        throw new Error('Ollama no respondió correctamente');
      }
    } catch (error: any) {
      console.error('❌ Error al conectar con Ollama:', error);
    return NextResponse.json(
      {
        success: true,
        data: {
          connected: false,
          message: `No se pudo conectar a Ollama: ${error.message}`,
          availableModels: [],
          allModels: []
        }
      }
    );
  }
}

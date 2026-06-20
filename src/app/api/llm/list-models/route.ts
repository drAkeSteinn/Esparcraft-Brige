import { NextRequest, NextResponse } from 'next/server';
import { listModelsForProvider } from '@/lib/llm/callLLM';
import { LLMProviderConfig, LLMProviderType, PROVIDERS } from '@/lib/llm/types';

// POST /api/llm/list-models
// Lista los modelos disponibles de un proveedor temporal (no guardado en DB).
// Útil para el wizard de creación: el usuario ingresa URL + API key y obtiene
// los modelos disponibles sin necesidad de guardar primero.
//
// Body:
// {
//   type: 'ollama' | 'openai' | 'grok' | 'anthropic' | 'custom',
//   apiUrl: string,
//   apiKey?: string
// }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !PROVIDERS[body.type as LLMProviderType]) {
      return NextResponse.json(
        { error: `Tipo inválido. Debe ser uno de: ${Object.keys(PROVIDERS).join(', ')}` },
        { status: 400 }
      );
    }
    if (!body.apiUrl?.trim()) {
      return NextResponse.json({ error: 'apiUrl es requerido' }, { status: 400 });
    }

    const info = PROVIDERS[body.type as LLMProviderType];
    if (!info.supportsModelListing) {
      return NextResponse.json({
        success: true,
        data: {
          models: [],
          message: `${info.label} no soporta listado de modelos. Use los modelos conocidos.`,
          knownModels: info.knownModels,
        },
      });
    }

    // Construir config temporal
    const tempProvider: LLMProviderConfig = {
      id: 'temp',
      name: 'temp',
      type: body.type,
      apiUrl: body.apiUrl.trim(),
      apiKey: body.apiKey?.trim() || null,
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      reasoning: false,
      toolCalling: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const models = await listModelsForProvider(tempProvider);
      return NextResponse.json({
        success: true,
        data: {
          models,
          knownModels: info.knownModels,
          message: `${models.length} modelo(s) encontrados`,
        },
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        data: {
          models: [],
          knownModels: info.knownModels,
          message: `No se pudieron listar modelos automáticamente: ${error instanceof Error ? error.message : 'error desconocido'}. Puedes escribir el nombre manualmente.`,
          error: error instanceof Error ? error.message : undefined,
        },
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    );
  }
}

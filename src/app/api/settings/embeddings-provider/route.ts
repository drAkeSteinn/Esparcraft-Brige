import { NextRequest, NextResponse } from 'next/server';

type EmbeddingProvider = 'textgen' | 'ollama';

interface EmbeddingsProviderConfig {
  provider: EmbeddingProvider;
  textGenUrl?: string;
  textGenModel?: string;
  textGenDimension?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  ollamaDimension?: string;
}

// Configuración del proveedor de embeddings en memoria
let embeddingsProviderConfig: EmbeddingsProviderConfig = {
  provider: 'textgen'
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: embeddingsProviderConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: Partial<EmbeddingsProviderConfig> = await request.json();

    console.log('=== POST /api/settings/embeddings-provider ===');
    console.log('Config recibida:', config);

    // Validar que el proveedor sea válido
    if (config.provider && !['textgen', 'ollama'].includes(config.provider)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proveedor debe ser "textgen" o "ollama"',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    embeddingsProviderConfig = {
      ...embeddingsProviderConfig,
      ...config
    } as EmbeddingsProviderConfig;

    console.log('✅ Proveedor de embeddings actualizado:', embeddingsProviderConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Proveedor de embeddings actualizado correctamente',
        config: embeddingsProviderConfig,
      },
    });
  } catch (error: any) {
    console.error('Error actualizando proveedor de embeddings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el proveedor de embeddings',
      },
      { status: 500 }
    );
  }
}

// Función helper para obtener la configuración actual (para usar en otros módulos)
export function getEmbeddingsProviderConfig(): EmbeddingsProviderConfig {
  return embeddingsProviderConfig;
}

export function updateEmbeddingsProviderConfig(updates: Partial<EmbeddingsProviderConfig>): void {
  embeddingsProviderConfig = {
    ...embeddingsProviderConfig,
    ...updates
  };
}

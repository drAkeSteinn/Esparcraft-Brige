import { NextRequest, NextResponse } from 'next/server';

interface EmbeddingsGlobalConfig {
  similarityThreshold: number;
  maxResults: number;
  defaultNamespace: string;
}

// Configuración en memoria de embeddings globales
let embeddingsGlobalConfig: EmbeddingsGlobalConfig = {
  similarityThreshold: 0.7,
  maxResults: 5,
  defaultNamespace: 'default',
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: embeddingsGlobalConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: EmbeddingsGlobalConfig = await request.json();

    // Validar umbral de similitud
    if (
      typeof config.similarityThreshold !== 'number' ||
      config.similarityThreshold < 0 ||
      config.similarityThreshold > 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Umbral de similitud debe ser un número entre 0 y 1',
        },
        { status: 400 }
      );
    }

    // Validar resultados máximos
    if (
      typeof config.maxResults !== 'number' ||
      config.maxResults < 1 ||
      config.maxResults > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resultados máximos debe ser un número entre 1 y 50',
        },
        { status: 400 }
      );
    }

    // Validar namespace por defecto
    if (
      !config.defaultNamespace ||
      typeof config.defaultNamespace !== 'string' ||
      config.defaultNamespace.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Namespace por defecto es requerido',
        },
        { status: 400 }
      );
    }

    // Sanitizar namespace (solo permitir caracteres válidos)
    const sanitizedNamespace = config.defaultNamespace
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '');

    if (sanitizedNamespace.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Namespace por defecto no es válido',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    embeddingsGlobalConfig = {
      similarityThreshold: config.similarityThreshold,
      maxResults: config.maxResults,
      defaultNamespace: sanitizedNamespace,
    };

    console.log('Configuración de embeddings globales actualizada:', embeddingsGlobalConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de embeddings globales aplicada correctamente',
        config: embeddingsGlobalConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de embeddings globales:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de embeddings globales',
      },
      { status: 500 }
    );
  }
}

// Función helper para obtener la configuración actual (para usar en otros módulos)
export function getEmbeddingsGlobalConfig(): EmbeddingsGlobalConfig {
  return embeddingsGlobalConfig;
}

export function updateEmbeddingsGlobalConfig(updates: Partial<EmbeddingsGlobalConfig>): void {
  embeddingsGlobalConfig = {
    ...embeddingsGlobalConfig,
    ...updates,
  };
}

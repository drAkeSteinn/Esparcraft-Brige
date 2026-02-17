import { NextRequest, NextResponse } from 'next/server';
import { getOllamaClient } from '@/lib/embeddings/ollama-client';
import { loadConfig, saveConfig, getConfig, type EmbeddingsConfig } from '@/lib/config-persistence';

interface EmbeddingsGlobalConfig {
  similarityThreshold?: number;
  maxResults?: number;
  defaultNamespace?: string;
  // Configuración de Ollama
  ollamaUrl?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
}

// Configuración en memoria de embeddings globales (configuración adicional)
let embeddingsGlobalConfig: EmbeddingsGlobalConfig = {
  defaultNamespace: 'default',
};

export async function GET(request: NextRequest) {
  // Cargar configuración persistente
  const persistentConfig = getConfig();

  return NextResponse.json({
    success: true,
    data: {
      ...embeddingsGlobalConfig,
      ollamaUrl: persistentConfig.ollamaUrl,
      embeddingModel: persistentConfig.model,
      embeddingDimension: persistentConfig.dimension,
      similarityThreshold: persistentConfig.similarityThreshold,
      maxResults: persistentConfig.maxResults,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: EmbeddingsGlobalConfig = await request.json();

    // Validar namespace por defecto si se proporciona
    if (config.defaultNamespace !== undefined) {
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
      config.defaultNamespace = sanitizedNamespace;
    }

    // Cargar configuración anterior para comparar
    const previousConfig = getConfig();
    const previousDimension = previousConfig.dimension;
    const previousModel = previousConfig.model;

    // Guardar configuración en archivo persistente
    const newPersistentConfig = saveConfig({
      ollamaUrl: config.ollamaUrl || previousConfig.ollamaUrl,
      model: config.embeddingModel || previousConfig.model,
      dimension: config.embeddingDimension || previousConfig.dimension,
      similarityThreshold: config.similarityThreshold,
      maxResults: config.maxResults,
    });

    // Aplicar configuración de Ollama al cliente
    if (config.ollamaUrl || config.embeddingModel || config.embeddingDimension) {
      try {
        getOllamaClient({
          ollamaUrl: newPersistentConfig.ollamaUrl,
          model: newPersistentConfig.model,
          dimension: newPersistentConfig.dimension,
        });
        console.log('✅ Cliente Ollama actualizado con nueva configuración:', {
          url: newPersistentConfig.ollamaUrl,
          model: newPersistentConfig.model,
          dimension: newPersistentConfig.dimension,
          similarityThreshold: newPersistentConfig.similarityThreshold,
          maxResults: newPersistentConfig.maxResults,
        });
      } catch (error) {
        console.error('Error actualizando cliente Ollama:', error);
      }
    }

    // Actualizar configuración en memoria (otros valores)
    embeddingsGlobalConfig = {
      ...embeddingsGlobalConfig,
      defaultNamespace: config.defaultNamespace,
    };

    // Advertir si cambió la dimensión
    const dimensionChanged = previousDimension !== newPersistentConfig.dimension;
    const modelChanged = previousModel !== newPersistentConfig.model;

    console.log('Configuración de embeddings actualizada:', newPersistentConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de embeddings aplicada correctamente',
        config: {
          ...embeddingsGlobalConfig,
          ollamaUrl: newPersistentConfig.ollamaUrl,
          embeddingModel: newPersistentConfig.model,
          embeddingDimension: newPersistentConfig.dimension,
          similarityThreshold: newPersistentConfig.similarityThreshold,
          maxResults: newPersistentConfig.maxResults,
        },
        warnings: dimensionChanged || modelChanged ? {
          dimensionChanged,
          modelChanged,
          message: dimensionChanged
            ? `La dimensión cambió de ${previousDimension} a ${newPersistentConfig.dimension}. Los embeddings existentes pueden no ser compatibles. Si tienes problemas, usa el botón "Reiniciar Base de Datos" en la configuración.`
            : undefined
        } : undefined
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
export function getEmbeddingsGlobalConfig(): EmbeddingsGlobalConfig & EmbeddingsConfig {
  const persistentConfig = getConfig();
  return {
    ...embeddingsGlobalConfig,
    ollamaUrl: persistentConfig.ollamaUrl,
    embeddingModel: persistentConfig.model,
    embeddingDimension: persistentConfig.dimension,
    similarityThreshold: persistentConfig.similarityThreshold,
    maxResults: persistentConfig.maxResults,
  };
}

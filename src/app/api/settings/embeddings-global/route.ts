import { NextRequest, NextResponse } from 'next/server';
import { getOllamaClient } from '@/lib/embeddings/ollama-client';
import { loadConfig, saveConfig, getConfig, type EmbeddingsConfig } from '@/lib/config-persistence';
import { closeLanceDB, initLanceDB, LanceDBWrapper } from '@/lib/lancedb-db';
import { EmbeddingTriggers } from '@/lib/embedding-triggers';
import * as fs from 'fs';
import * as path from 'path';

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

    // ============================================
    // AUTO-MIGRACIÓN: si cambió el modelo o la dimensión Y hay datos existentes,
    // reiniciar LanceDB automáticamente y re-embed los datos fuente.
    // Esto evita errores de DIMENSION_MISMATCH y vectores corruptos.
    // ============================================
    const dimensionChanged = previousDimension !== newPersistentConfig.dimension;
    const modelChanged = previousModel !== newPersistentConfig.model;

    console.log('Configuración de embeddings actualizada:', newPersistentConfig);
    console.log(`  Cambios detectados: dimension=${dimensionChanged} (${previousDimension}→${newPersistentConfig.dimension}), model=${modelChanged} (${previousModel}→${newPersistentConfig.model})`);

    let migrationResult: {
      performed: boolean;
      reason?: string;
      previousModel?: string;
      newModel?: string;
      previousDimension?: number;
      newDimension?: number;
      previousEmbeddingsCount?: number;
      reembeddedResources?: number;
      reembeddedBreakdown?: Record<string, number>;
      error?: string;
    } = { performed: false };

    if (dimensionChanged || modelChanged) {
      // Verificar si hay datos existentes en LanceDB
      let existingCount = 0;
      try {
        const stats = await LanceDBWrapper.getStats();
        existingCount = stats.totalEmbeddings;
      } catch (statsErr: any) {
        console.warn('[embeddings-global] No se pudo obtener stats de LanceDB (probablemente no existe aún):', statsErr?.message);
      }

      if (existingCount > 0) {
        console.log(`🔄 Cambio de modelo detectado con ${existingCount} embeddings existentes. Iniciando auto-migración...`);

        migrationResult.performed = true;
        migrationResult.previousModel = previousModel;
        migrationResult.newModel = newPersistentConfig.model;
        migrationResult.previousDimension = previousDimension;
        migrationResult.newDimension = newPersistentConfig.dimension;
        migrationResult.previousEmbeddingsCount = existingCount;

        try {
          // Paso 1: Cerrar conexión LanceDB
          console.log('  [1/3] Cerrando conexión LanceDB...');
          await closeLanceDB();

          // Paso 2: Eliminar carpeta de LanceDB
          console.log('  [2/3] Eliminando carpeta data/lancedb/...');
          const lancedbPath = path.join(process.cwd(), 'data', 'lancedb');
          if (fs.existsSync(lancedbPath)) {
            fs.rmSync(lancedbPath, { recursive: true, force: true });
          }

          // Paso 3: Reinicializar LanceDB con la nueva dimensión
          console.log(`  [3/3] Reinicializando LanceDB con dimensión ${newPersistentConfig.dimension}...`);
          await initLanceDB();

          console.log('✅ LanceDB reiniciada correctamente con la nueva configuración.');

          // Paso 4: Re-embed automático de todos los datos fuente
          // Esto regenera los embeddings de worlds, pueblos, edificios, npcs y sessions
          // con el nuevo modelo. Los vectores subidos manualmente (source_type=custom)
          // no se pueden regenerar automáticamente.
          console.log('🔄 Iniciando re-embed de datos fuente...');
          const reembeddedBreakdown: Record<string, number> = {};
          let reembeddedResources = 0;

          // Usar el cliente Ollama ya actualizado con la nueva config
          // EmbeddingTriggers.embedAllResources usa internamente el cliente persistente

          for (const type of ['worlds', 'pueblos', 'edificios', 'npcs', 'sessions'] as const) {
            try {
              const beforeStats = await LanceDBWrapper.getStats();
              await EmbeddingTriggers.embedAllResources(type);
              const afterStats = await LanceDBWrapper.getStats();
              const diff = afterStats.totalEmbeddings - beforeStats.totalEmbeddings;
              reembeddedBreakdown[type] = diff > 0 ? diff : 0;
              reembeddedResources += diff > 0 ? diff : 0;
              console.log(`  ✓ Re-embed ${type}: +${diff} embeddings`);
            } catch (embedErr: any) {
              console.warn(`  ⚠️ Error re-embeddeando ${type}:`, embedErr?.message);
              reembeddedBreakdown[type] = 0;
            }
          }

          migrationResult.reembeddedResources = reembeddedResources;
          migrationResult.reembeddedBreakdown = reembeddedBreakdown;

          console.log(`✅ Re-embed completado: ${reembeddedResources} recursos regenerados.`);
        } catch (migrateErr: any) {
          console.error('❌ Error durante la auto-migración:', migrateErr);
          migrationResult.error = migrateErr?.message || 'Error desconocido durante la migración';
          // Intentar reinicializar LanceDB aunque haya error, para no dejar el sistema roto
          try {
            await initLanceDB();
          } catch (reinitErr) {
            console.error('❌ Error reinicializando LanceDB tras fallo:', reinitErr);
          }
        }
      } else {
        // Cambio de modelo pero no hay datos existentes: no se necesita migración
        console.log('ℹ️ Cambio de modelo detectado pero no hay embeddings existentes. No se requiere migración.');
        migrationResult.reason = 'No había embeddings existentes, no se requiere migración';
      }
    }

    // Construir mensaje de respuesta
    let message = 'Configuración de embeddings aplicada correctamente';
    if (migrationResult.performed && !migrationResult.error) {
      message = `Configuración actualizada. Base de datos reiniciada y ${migrationResult.reembeddedResources} recursos re-embeddeados automáticamente con el nuevo modelo "${newPersistentConfig.model}" (${newPersistentConfig.dimension}D).`;
    } else if (migrationResult.performed && migrationResult.error) {
      message = `Configuración actualizada, pero la migración automática tuvo errores: ${migrationResult.error}`;
    } else if (migrationResult.reason) {
      message = `Configuración actualizada. ${migrationResult.reason}.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        message,
        config: {
          ...embeddingsGlobalConfig,
          ollamaUrl: newPersistentConfig.ollamaUrl,
          embeddingModel: newPersistentConfig.model,
          embeddingDimension: newPersistentConfig.dimension,
          similarityThreshold: newPersistentConfig.similarityThreshold,
          maxResults: newPersistentConfig.maxResults,
        },
        migration: migrationResult,
        // Mantener warnings por compatibilidad con UI existente, pero ahora migration.performed es la fuente principal
        warnings: (dimensionChanged || modelChanged) ? {
          dimensionChanged,
          modelChanged,
          autoMigrated: migrationResult.performed,
          message: migrationResult.performed && !migrationResult.error
            ? `Migración automática completada: ${migrationResult.reembeddedResources} recursos re-embeddeados.`
            : dimensionChanged
              ? `La dimensión cambió de ${previousDimension} a ${newPersistentConfig.dimension}.`
              : undefined,
        } : undefined,
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

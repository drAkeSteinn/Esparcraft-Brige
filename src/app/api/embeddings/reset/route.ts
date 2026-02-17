import { NextRequest, NextResponse } from 'next/server';
import { closeLanceDB, initLanceDB } from '@/lib/lancedb-db';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/embeddings/reset
 * Reinicia la base de datos de embeddings (elimina todos los datos)
 * 
 * Body:
 * {
 *   confirm: boolean  // Se requiere confirmación explícita
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Requerir confirmación explícita
    if (!body.confirm) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere confirmación explícita. Envía { confirm: true }',
          warning: 'Esta acción eliminará TODOS los embeddings almacenados.'
        },
        { status: 400 }
      );
    }

    console.log('🔄 Reiniciando base de datos de embeddings...');

    // Cerrar conexión existente
    await closeLanceDB();

    // Eliminar carpeta de LanceDB
    const lancedbPath = path.join(process.cwd(), 'data', 'lancedb');
    
    if (fs.existsSync(lancedbPath)) {
      // Eliminar recursivamente
      fs.rmSync(lancedbPath, { recursive: true, force: true });
      console.log(`✅ Carpeta eliminada: ${lancedbPath}`);
    }

    // Reinicializar con la nueva dimensión
    await initLanceDB();

    console.log('✅ Base de datos de embeddings reiniciada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Base de datos de embeddings reiniciada correctamente',
      data: {
        lancedbPath,
        timestamp: new Date().toISOString(),
        newDimension: process.env.EMBEDDING_DIMENSION || '768',
        newModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text'
      }
    });

  } catch (error: any) {
    console.error('Error al reiniciar base de datos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al reiniciar la base de datos',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings/reset
 * Obtiene información sobre el estado actual de la base de datos
 */
export async function GET() {
  try {
    const lancedbPath = path.join(process.cwd(), 'data', 'lancedb');
    const exists = fs.existsSync(lancedbPath);
    
    let size = 0;
    let files = 0;
    
    if (exists) {
      const filesList = fs.readdirSync(lancedbPath, { recursive: true }) as string[];
      files = filesList.length;
      
      for (const file of filesList) {
        const filePath = path.join(lancedbPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            size += stats.size;
          }
        } catch {
          // Ignorar errores de archivos individuales
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        exists,
        path: lancedbPath,
        totalFiles: files,
        totalSize: size,
        totalSizeFormatted: formatBytes(size),
        configuredDimension: process.env.EMBEDDING_DIMENSION || '768',
        configuredModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text'
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener información'
      },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

import { NextRequest, NextResponse } from 'next/server';
import { LanceDBWrapper, closeLanceDB, initLanceDB } from '@/lib/lancedb-db';

/**
 * POST /api/settings/apply-lancedb
 * Aplica la configuración de LanceDB
 *
 * Body:
 * {
 *   storagePath: string,
 *   autoCreate: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    if (config.storagePath && typeof config.storagePath === 'string') {
      // Construir ruta completa
      const fullPath = config.storagePath.startsWith('./')
        ? `${process.cwd()}/${config.storagePath.slice(2)}`
        : config.storagePath;

      console.log('Aplicando configuración de LanceDB con ruta:', fullPath);

      // Cerrar conexión existente
      await closeLanceDB();

      // Inicializar LanceDB con la nueva ruta
      if (config.autoCreate) {
        // Asegurar que el directorio existe
        const fs = await import('fs/promises');
        const path = await import('path');
        const dir = path.dirname(fullPath);
        
        try {
          await fs.mkdir(dir, { recursive: true });
          console.log('Directorio creado o ya existe:', dir);
        } catch (error) {
          console.warn('No se pudo crear directorio:', error);
        }
      }

      await initLanceDB(fullPath);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de LanceDB aplicada correctamente'
    });
  } catch (error: any) {
    console.error('Error al aplicar configuración de LanceDB:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aplicar configuración'
      },
      { status: 500 }
    );
  }
}

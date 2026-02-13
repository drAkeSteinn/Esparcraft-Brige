import { NextRequest, NextResponse } from 'next/server';
import { LanceDBWrapper, closeLanceDB, initLanceDB } from '@/lib/lancedb-db';

/**
 * POST /api/settings/test-lancedb
 * Prueba la conexión a LanceDB
 *
 * Body:
 * {
 *   storagePath: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { storagePath } = await request.json();

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json(
        { error: 'storagePath es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    // Cerrar conexión existente si la hay
    await closeLanceDB();

    // Construir ruta completa
    const fullPath = storagePath.startsWith('./')
      ? `${process.cwd()}/${storagePath.slice(2)}`
      : storagePath;

    console.log('Inicializando LanceDB con ruta:', fullPath);

    // Inicializar LanceDB con la ruta personalizada
    await initLanceDB(fullPath);

    // Probar conexión + obtener estadísticas
    const connected = await LanceDBWrapper.checkConnection();
    
    if (!connected) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message: 'No se pudo conectar a LanceDB'
        }
      });
    }

    const stats = await LanceDBWrapper.getStats();

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        message: 'LanceDB funciona correctamente',
        dbStats: stats
      }
    });
  } catch (error: any) {
    console.error('Error al probar LanceDB:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar LanceDB'
      },
      { status: 500 }
    );
  }
}

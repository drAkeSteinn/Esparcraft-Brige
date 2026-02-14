import { NextRequest, NextResponse } from 'next/server';
import {
  testLanceDBConnection,
  getSystemInfo,
  isLanceDBAvailable,
  getDefaultLanceDBPath,
  getPlatform,
  isWindows,
  isLinux,
  isMacOS,
  getCurrentUri,
  isDBInitialized
} from '@/lib/lancedb-safe';

/**
 * GET /api/settings/test-lancedb
 * Obtiene información del sistema y estado actual
 */
export async function GET() {
  try {
    // Verificar disponibilidad de LanceDB
    const { available, error } = await isLanceDBAvailable();
    const systemInfo = await getSystemInfo();
    
    return NextResponse.json({
      success: true,
      data: {
        systemInfo: {
          platform: getPlatform(),
          isWindows: isWindows(),
          isLinux: isLinux(),
          isMacOS: isMacOS(),
          currentUri: getCurrentUri(),
          isInitialized: isDBInitialized(),
          lancedbAvailable: available,
          lancedbError: error
        },
        defaultPath: getDefaultLanceDBPath(),
        lancedbAvailable: available,
        lancedbError: error
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/settings/test-lancedb:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/settings/test-lancedb
 * Prueba la conexión a LanceDB y retorna estadísticas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedPath = body?.storagePath || process.env.LANCEDB_URI || getDefaultLanceDBPath();
    
    console.log('🧪 Probando conexión a LanceDB...');
    console.log('   Plataforma:', getPlatform());
    console.log('   Ruta solicitada:', requestedPath);
    
    // Ejecutar prueba de conexión usando el wrapper seguro
    const result = await testLanceDBConnection(requestedPath);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('❌ Error al probar LanceDB:', error);
    
    // Obtener información del sistema aunque haya error
    const systemInfo = await getSystemInfo().catch(() => ({
      platform: getPlatform(),
      isWindows: isWindows(),
      isLinux: isLinux(),
      isMacOS: isMacOS(),
      currentUri: null,
      isInitialized: false,
      lancedbAvailable: false,
      lancedbError: error.message
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        message: `Error inesperado: ${error.message}`,
        error: error.message,
        systemInfo
      }
    });
  }
}

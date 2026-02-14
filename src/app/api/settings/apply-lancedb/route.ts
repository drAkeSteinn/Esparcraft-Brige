import { NextRequest, NextResponse } from 'next/server';
import { 
  closeLanceDB, 
  initLanceDB, 
  isDBInitialized,
  getCurrentUri,
  normalizePath,
  ensureLanceDBDirectory,
  getPlatform,
  isLanceDBAvailable
} from '@/lib/lancedb-db';

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
    
    if (!config.storagePath || typeof config.storagePath !== 'string') {
      return NextResponse.json(
        { success: false, error: 'storagePath es requerido' },
        { status: 400 }
      );
    }

    console.log('🔧 Aplicando configuración de LanceDB...');
    console.log('   Plataforma:', getPlatform());
    console.log('   Ruta solicitada:', config.storagePath);

    // Verificar si LanceDB está disponible
    const { available, error: lancedbError } = await isLanceDBAvailable();
    
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'LanceDB no está disponible en este sistema',
        details: lancedbError,
        suggestion: 'Verifica que tu sistema sea compatible con LanceDB (Linux x64 glibc, macOS ARM/x64, Windows x64).'
      }, { status: 503 });
    }

    // Normalizar la ruta
    const normalizedPath = normalizePath(config.storagePath);
    
    // Verificar/crear directorio
    const dirResult = ensureLanceDBDirectory(normalizedPath);
    if (!dirResult.success) {
      return NextResponse.json({
        success: false,
        error: `Error con el directorio: ${dirResult.error}`
      }, { status: 400 });
    }

    // Cerrar conexión existente
    if (isDBInitialized()) {
      console.log('   Cerrando conexión anterior...');
      await closeLanceDB();
    }

    // Inicializar con la nueva ruta
    console.log('   Inicializando LanceDB en:', normalizedPath);
    await initLanceDB(normalizedPath);

    // Verificar que se aplicó correctamente
    const newUri = getCurrentUri();
    
    return NextResponse.json({
      success: true,
      message: 'Configuración de LanceDB aplicada correctamente',
      data: {
        appliedPath: newUri,
        platform: getPlatform()
      }
    });
  } catch (error: any) {
    console.error('❌ Error al aplicar configuración de LanceDB:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aplicar configuración',
        suggestion: error.getSuggestion?.() || undefined
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/resumen-general/config
 * Obtiene la configuración actual del resumen general
 */
export async function GET(request: NextRequest) {
  try {
    // Leer configuración del archivo
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'db', 'resumen-general-config.json');

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return NextResponse.json({
        success: true,
        data: config
      });
    } catch (error) {
      // Archivo no existe, retornar valor por defecto
      return NextResponse.json({
        success: true,
        data: { minMessages: 10 }
      });
    }
  } catch (error) {
    console.error('Error in GET /api/resumen-general/config:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

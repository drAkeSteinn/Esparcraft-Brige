import { NextRequest, NextResponse } from 'next/server';
import { configurePool } from '@/lib/embeddings-db';

/**
 * POST /api/settings/apply-postgres
 * Aplica la configuración de PostgreSQL guardada
 *
 * Body:
 * {
 *   host: string,
 *   port: string,
 *   database: string,
 *   user: string,
 *   password: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    if (!config.host || !config.port || !config.database || !config.user) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Configurar el pool con las credenciales proporcionadas
    configurePool({
      host: config.host,
      port: parseInt(config.port),
      database: config.database,
      user: config.user,
      password: config.password
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de PostgreSQL aplicada correctamente'
      }
    });
  } catch (error: any) {
    console.error('Error al aplicar configuración:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aplicar configuración'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';

/**
 * POST /api/settings/test-postgres
 * Prueba la conexión a PostgreSQL con las credenciales proporcionadas
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

    const pool = new pg.Pool({
      host: config.host,
      port: parseInt(config.port),
      database: config.database,
      user: config.user,
      password: config.password,
      max: 1, // Solo una conexión para pruebas
      connectionTimeoutMillis: 5000, // 5 segundos timeout
    });

    try {
      const client = await pool.connect();
      
      // Verificar que pgvector esté instalado
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as pgvector_installed
      `);

      await client.release();
      await pool.end();

      const pgvectorInstalled = result.rows[0]?.pgvector_installed || false;

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          message: pgvectorInstalled 
            ? 'Conexión exitosa. pgvector está instalado.'
            : 'Conexión exitosa pero pgvector NO está instalado. Necesario para embeddings.'
        },
        pgvector_installed: pgvectorInstalled
      });
    } catch (error: any) {
      await pool.end();

      let message = 'No se pudo conectar a PostgreSQL';
      
      if (error.code === 'ECONNREFUSED') {
        message = 'No se puede conectar. Verifica que PostgreSQL esté ejecutándose y el puerto sea correcto.';
      } else if (error.code === '3D000') {
        message = 'Base de datos no existe. Verifica el nombre de la base de datos.';
      } else if (error.code === '28P01') {
        message = 'Error de autenticación. Verifica usuario y contraseña.';
      } else if (error.code === '28000') {
        message = 'Contraseña incorrecta o usuario no existe.';
      }

      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          message,
          error_code: error.code
        }
      });
    }
  } catch (error: any) {
    console.error('Error al probar PostgreSQL:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión'
      },
      { status: 500 }
    );
  }
}

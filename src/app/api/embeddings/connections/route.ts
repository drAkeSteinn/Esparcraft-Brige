import { NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';
import { getEmbeddingsProviderConfig } from '@/app/api/settings/embeddings-provider/route';
import { LanceEmbeddingsDB } from '@/lib/embeddings/lance-embeddings';

/**
 * GET /api/embeddings/connections
 * Verifica el estado de las conexiones del sistema de embeddings
 * Ahora usa LanceDB (corre en Node.js) en lugar de PostgreSQL
 */
export async function GET() {
  try {
    // Obtener la configuración del proveedor
    const providerConfig = getEmbeddingsProviderConfig();

    console.log('=== /api/embeddings/connections ===');
    console.log('Proveedor configurado:', providerConfig.provider);
    console.log('Configuración completa:', providerConfig);

    // Actualizar el cliente singleton con el proveedor correcto
    const client = getEmbeddingClient();
    client.setProvider(providerConfig.provider, {
      ...(providerConfig.provider === 'textgen' ? {
        textGenWebUIUrl: providerConfig.textGenUrl || 'http://localhost:5000',
        model: providerConfig.textGenModel || 'all-MiniLM-L6-v2',
        dimension: parseInt(providerConfig.textGenDimension || '384'),
      } : {
        textGenWebUIUrl: providerConfig.ollamaUrl || 'http://localhost:11434',
        model: providerConfig.ollamaModel || 'nomic-embed-text',
        dimension: parseInt(providerConfig.ollamaDimension || '768'),
      })
    });

    console.log('Verificando conexiones...');
    const connections = await client.checkConnections();
    console.log('Resultados de conexiones:', connections);

    return NextResponse.json({
      success: true,
      data: {
        provider: providerConfig.provider,
        // LanceDB corre en el mismo proceso Node.js, siempre disponible
        db: connections.db,
        textGen: connections.textGen,
        ollama: connections.ollama,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error al verificar conexiones:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar conexiones',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/embeddings/connections
 * Prueba la conexión a LanceDB
 */
export async function POST() {
  try {
    console.log('=== POST /api/embeddings/connections ===');
    console.log('Probando conexión a LanceDB...');

    const connected = await LanceEmbeddingsDB.checkConnection();

    console.log('Resultado de prueba de conexión:', connected);

    return NextResponse.json({
      success: true,
      data: {
        connected,
        message: connected
          ? 'LanceDB está funcionando correctamente'
          : 'No se pudo conectar a LanceDB'
      }
    });
  } catch (error: any) {
    console.error('Error al probar conexión:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al probar conexión',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

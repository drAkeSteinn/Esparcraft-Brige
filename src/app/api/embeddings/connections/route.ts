import { NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * GET /api/embeddings/connections
 * Verifica el estado de las conexiones del sistema de embeddings
 */
export async function GET() {
  try {
    const embeddingClient = getEmbeddingClient();
    const connections = await embeddingClient.checkConnections();

    return NextResponse.json({
      success: true,
      data: {
        db: connections.db,
        textGen: connections.textGen,
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

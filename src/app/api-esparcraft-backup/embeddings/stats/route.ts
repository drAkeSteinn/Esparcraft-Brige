import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * GET /api/embeddings/stats
 * Obtiene estadísticas del sistema de embeddings
 */
export async function GET() {
  try {
    const embeddingClient = getEmbeddingClient();
    const stats = await embeddingClient.getStats();

    return NextResponse.json({
      success: true,
      data: {
        totalEmbeddings: stats.totalEmbeddings,
        totalNamespaces: stats.totalNamespaces,
        embeddingsByNamespace: stats.embeddingsByNamespace,
        embeddingsBySourceType: stats.embeddingsBySourceType,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener estadísticas',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

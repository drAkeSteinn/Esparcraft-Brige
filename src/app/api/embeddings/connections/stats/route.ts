import { NextResponse } from 'next/server';
import { LanceEmbeddingsDB } from '@/lib/embeddings/lance-embeddings';

/**
 * GET /api/embeddings/connections/stats
 * Obtiene estadísticas de la base de datos de embeddings (LanceDB)
 */
export async function GET() {
  try {
    console.log('=== GET /api/embeddings/connections/stats ===');
    console.log('Obteniendo estadísticas de LanceDB...');

    const stats = await LanceEmbeddingsDB.getStats();

    console.log('Estadísticas obtenidas:', stats);

    return NextResponse.json({
      success: true,
      data: {
        total_embeddings: stats.totalEmbeddings,
        total_namespaces: stats.totalNamespaces,
        unique_sources: stats.unique_sources,
        storage_size_mb: stats.storage_size_mb,
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
      { status: 500 }
    );
  }
}

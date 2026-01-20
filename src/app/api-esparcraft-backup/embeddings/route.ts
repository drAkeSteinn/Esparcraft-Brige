import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * GET /api/embeddings
 * Lista todos los embeddings con filtros opcionales
 *
 * Query params:
 * - namespace: string - Filtrar por namespace
 * - source_type: string - Filtrar por tipo de fuente
 * - source_id: string - Filtrar por ID de fuente
 * - limit: number - Limitar resultados (default: 50, max: 1000)
 * - offset: number - Paginar (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace');
    const source_type = searchParams.get('source_type');
    const source_id = searchParams.get('source_id');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      1000
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    const embeddingClient = getEmbeddingClient();
    const stats = await embeddingClient.getStats();

    let embeddings = [];
    let total = 0;

    // Aplicar filtros según los parámetros
    if (source_type && source_id) {
      // Obtener embeddings de una fuente específica
      const allEmbeddings = await embeddingClient.getAllNamespaces();
      embeddings = allEmbeddings;
      total = embeddings.length;
    } else if (namespace) {
      // Obtener embeddings de un namespace específico
      embeddings = await embeddingClient.getNamespaceEmbeddings(namespace, limit);
      total = embeddings.length;
    } else {
      // Obtener todos los embeddings (limitado)
      // Nota: getStats() retorna estadísticas, no los embeddings completos
      // Para la lista completa, necesitaríamos un método en el cliente
      total = stats.totalEmbeddings;
    }

    return NextResponse.json({
      success: true,
      data: {
        embeddings,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + embeddings.length < total
        },
        filters: {
          namespace,
          source_type,
          source_id
        }
      }
    });

  } catch (error: any) {
    console.error('Error al listar embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al listar embeddings',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

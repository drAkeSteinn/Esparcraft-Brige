import { NextRequest, NextResponse } from 'next/server';
import { LanceDBWrapper } from '@/lib/lancedb-db';

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

    let embeddings = [];
    let total = 0;

    // Aplicar filtros según los parámetros
    if (namespace) {
      // Obtener embeddings de un namespace específico
      embeddings = await LanceDBWrapper.getNamespaceEmbeddings(namespace, limit);
      total = embeddings.length;
    } else {
      // Obtener todos los embeddings
      embeddings = await LanceDBWrapper.getAllEmbeddings(limit);
      total = embeddings.length;
    }

    // Filtrar por source_type si se especifica
    if (source_type) {
      embeddings = embeddings.filter((e: any) => e.source_type === source_type);
    }

    // Filtrar por source_id si se especifica
    if (source_id) {
      embeddings = embeddings.filter((e: any) => e.source_id === source_id);
    }

    // Formatear para el frontend
    const formattedEmbeddings = embeddings.map((emb: any) => ({
      id: emb.id,
      content: emb.content,
      metadata: emb.metadata || {},
      namespace: emb.namespace || 'default',
      source_type: emb.source_type,
      source_id: emb.source_id,
      created_at: emb.created_at instanceof Date ? emb.created_at.toISOString() : emb.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        embeddings: formattedEmbeddings,
        total: formattedEmbeddings.length,
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

import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * GET /api/embeddings/namespaces
 * Obtiene todos los namespaces
 */
export async function GET() {
  try {
    const embeddingClient = getEmbeddingClient();
    const namespaces = await embeddingClient.getAllNamespaces();

    // Obtener conteo de embeddings por namespace
    const stats = await embeddingClient.getStats();
    const namespacesWithCount = namespaces.map(ns => ({
      ...ns,
      embedding_count: stats.embeddingsByNamespace[ns.namespace] || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        namespaces: namespacesWithCount,
        total: namespacesWithCount.length
      }
    });
  } catch (error: any) {
    console.error('Error al obtener namespaces:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener namespaces',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/embeddings/namespaces
 * Crea un nuevo namespace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.namespace || typeof body.namespace !== 'string') {
      return NextResponse.json(
        { error: 'namespace es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    const embeddingClient = getEmbeddingClient();
    const namespace = await embeddingClient.upsertNamespace({
      namespace: body.namespace,
      description: body.description,
      metadata: body.metadata || {}
    });

    return NextResponse.json({
      success: true,
      data: namespace
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear namespace:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear namespace',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

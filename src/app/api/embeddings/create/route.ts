import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';
import type { CreateEmbeddingParams } from '@/lib/embeddings/types';

/**
 * POST /api/embeddings/create
 * Crea un nuevo embedding
 *
 * Body:
 * {
 *   content: string;
 *   metadata?: Record<string, any>;
 *   namespace?: string;
 *   source_type?: 'world' | 'pueblo' | 'edificio' | 'npc' | 'session' | 'custom';
 *   source_id?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'content es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    if (body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content no puede estar vacío' },
        { status: 400 }
      );
    }

    const params: CreateEmbeddingParams = {
      content: body.content,
      metadata: body.metadata || {},
      namespace: body.namespace || 'default',
      source_type: body.source_type,
      source_id: body.source_id
    };

    const embeddingClient = getEmbeddingClient();
    const embeddingId = await embeddingClient.createEmbedding(params);

    return NextResponse.json({
      success: true,
      data: {
        id: embeddingId,
        content: params.content,
        metadata: params.metadata,
        namespace: params.namespace,
        source_type: params.source_type,
        source_id: params.source_id
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear embedding',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';
import type { CreateEmbeddingParams } from '@/lib/embeddings/types';

/**
 * POST /api/embeddings/batch
 * Crea múltiples embeddings en batch
 *
 * Body:
 * {
 *   items: Array<{
 *     content: string;
 *     metadata?: Record<string, any>;
 *     source_type?: string;
 *     source_id?: string;
 *   }>;
 *   namespace?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'items es requerido y debe ser un array no vacío' },
        { status: 400 }
      );
    }

    if (body.items.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 items por batch' },
        { status: 400 }
      );
    }

    // Validar que cada item tenga content
    for (const item of body.items) {
      if (!item.content || typeof item.content !== 'string') {
        return NextResponse.json(
          { error: 'Cada item debe tener un campo content válido' },
          { status: 400 }
        );
      }

      if (item.content.trim().length === 0) {
        return NextResponse.json(
          { error: 'Ningún item puede tener content vacío' },
          { status: 400 }
        );
      }
    }

    const embeddingClient = getEmbeddingClient();
    const embeddingIds = await embeddingClient.createBatchEmbeddings(
      body.items,
      body.namespace
    );

    return NextResponse.json({
      success: true,
      data: {
        count: embeddingIds.length,
        ids: embeddingIds
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear embeddings en batch:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear embeddings en batch',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

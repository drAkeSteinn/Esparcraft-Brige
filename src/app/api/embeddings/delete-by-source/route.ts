import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * DELETE /api/embeddings/delete-by-source
 * Elimina todos los embeddings de una fuente específica
 *
 * Body:
 * {
 *   source_type: 'world' | 'pueblo' | 'edificio' | 'npc' | 'session' | 'custom';
 *   source_id: string;
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    if (!body.source_type) {
      return NextResponse.json(
        { error: 'source_type es requerido' },
        { status: 400 }
      );
    }

    if (!body.source_id) {
      return NextResponse.json(
        { error: 'source_id es requerido' },
        { status: 400 }
      );
    }

    const validSourceTypes = ['world', 'pueblo', 'edificio', 'npc', 'session', 'custom'];
    if (!validSourceTypes.includes(body.source_type)) {
      return NextResponse.json(
        { error: 'source_type debe ser uno de: ' + validSourceTypes.join(', ') },
        { status: 400 }
      );
    }

    const embeddingClient = getEmbeddingClient();
    const count = await embeddingClient.deleteBySource(
      body.source_type,
      body.source_id
    );

    return NextResponse.json({
      success: true,
      message: `Eliminados ${count} embeddings`,
      data: {
        count,
        source_type: body.source_type,
        source_id: body.source_id
      }
    });

  } catch (error: any) {
    console.error('Error al eliminar embeddings por fuente:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar embeddings',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

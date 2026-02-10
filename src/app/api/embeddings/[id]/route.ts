import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * GET /api/embeddings/[id]
 * Obtiene un embedding por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del embedding es requerido' },
        { status: 400 }
      );
    }

    const embeddingClient = getEmbeddingClient();
    const embedding = await embeddingClient.getEmbedding(id);

    if (!embedding) {
      return NextResponse.json(
        { error: 'Embedding no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: embedding
    });

  } catch (error: any) {
    console.error('Error al obtener embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener embedding',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/embeddings/[id]
 * Elimina un embedding por su ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del embedding es requerido' },
        { status: 400 }
      );
    }

    const embeddingClient = getEmbeddingClient();
    const deleted = await embeddingClient.deleteEmbedding(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Embedding no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Embedding eliminado exitosamente',
      data: { id }
    });

  } catch (error: any) {
    console.error('Error al eliminar embedding:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar embedding',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

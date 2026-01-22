import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

/**
 * DELETE /api/embeddings/namespaces/[namespace]
 * Elimina un namespace completo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { namespace: string } }
) {
  try {
    const { namespace } = params;

    if (!namespace) {
      return NextResponse.json(
        { error: 'namespace es requerido' },
        { status: 400 }
      );
    }

    const embeddingClient = getEmbeddingClient();
    const deleted = await embeddingClient.deleteNamespace(namespace);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Namespace no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { namespace, deleted }
    });
  } catch (error: any) {
    console.error('Error al eliminar namespace:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar namespace',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

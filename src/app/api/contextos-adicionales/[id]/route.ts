import { NextRequest, NextResponse } from 'next/server';
import { contextoAdicionalManager } from '@/lib/contextoAdicionalManager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/contextos-adicionales/[id]
 * Elimina un contexto adicional por ID.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const success = await contextoAdicionalManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Contexto adicional no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contexto adicional eliminado',
    });
  } catch (error: any) {
    console.error('Error eliminando contexto adicional:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

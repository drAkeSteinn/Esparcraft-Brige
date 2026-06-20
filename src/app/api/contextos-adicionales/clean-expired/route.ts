import { NextResponse } from 'next/server';
import { contextoAdicionalManager } from '@/lib/contextoAdicionalManager';

/**
 * POST /api/contextos-adicionales/clean-expired
 * Elimina todos los contextos adicionales expirados.
 */
export async function POST() {
  try {
    const deletedCount = await contextoAdicionalManager.cleanExpired();

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: deletedCount > 0
          ? `${deletedCount} contexto(s) expirado(s) eliminado(s)`
          : 'No había contextos expirados',
      },
    });
  } catch (error: any) {
    console.error('Error limpiando contextos expirados:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

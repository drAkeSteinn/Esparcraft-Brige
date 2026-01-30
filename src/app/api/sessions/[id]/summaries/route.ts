import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/fileManager';

/**
 * GET: Obtiene el historial completo de resúmenes de una sesión
 *
 * Returns:
 * - summaryHistory: Array con todos los resúmenes de la sesión, cada uno incluye:
 *   - summary: Texto del resumen
 *   - timestamp: Fecha y hora del resumen
 *   - version: Número de versión del resumen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[/api/sessions/${id}/summaries] Obteniendo historial de resúmenes...`);

    const summaryHistory = sessionManager.getSummaryHistory(id);

    console.log(`[/api/sessions/${id}/summaries] Encontrados ${summaryHistory.length} resúmenes en el historial`);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        summaryHistory,
        count: summaryHistory.length
      }
    });
  } catch (error) {
    console.error(`[/api/sessions/${id}/summaries] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session summary history' },
      { status: 500 }
    );
  }
}

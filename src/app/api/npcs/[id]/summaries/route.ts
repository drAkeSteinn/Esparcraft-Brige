import { NextRequest, NextResponse } from 'next/server';
import { summaryManager } from '@/lib/fileManager';

/**
 * GET: Obtiene todos los resúmenes de sesiones de un NPC específico
 *
 * Cada resumen incluye:
 * - sessionId: ID de la sesión
 * - npcId: ID del NPC
 * - playerId: ID del jugador (opcional)
 * - playerName: Nombre del jugador
 * - npcName: Nombre del NPC
 * - summary: Texto del resumen
 * - timestamp: Fecha y hora del resumen
 * - version: Número de versión del resumen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[/api/npcs/${id}/summaries] Buscando resúmenes del NPC...`);

    const summaries = summaryManager.getSummariesByNPC(id);

    console.log(`[/api/npcs/${id}/summaries] Encontrados ${summaries.length} resúmenes`);

    return NextResponse.json({
      success: true,
      data: {
        npcId: id,
        summaries: summaries,
        count: summaries.length
      }
    });
  } catch (error) {
    console.error(`[/api/npcs/${id}/summaries] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch NPC summaries' },
      { status: 500 }
    );
  }
}

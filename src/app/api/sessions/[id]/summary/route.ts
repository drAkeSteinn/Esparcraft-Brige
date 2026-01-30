import { NextRequest, NextResponse } from 'next/server';
import { summaryManager } from '@/lib/fileManager';

/**
 * GET summary for a specific session
 *
 * Returns:
 * - summary: Texto del resumen (mantiene compatibilidad con código existente)
 * - summaryData: Datos completos del resumen con metadata (npcId, playerName, npcName, version, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = summaryManager.getSummary(id);
    const summaryData = summaryManager.getSummaryData(id);

    if (summary === null) {
      return NextResponse.json({
        success: true,
        data: { summary: null, summaryData: null }
      });
    }

    return NextResponse.json({
      success: true,
      data: { summary, summaryData }
    });
  } catch (error) {
    console.error('Error fetching session summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session summary' },
      { status: 500 }
    );
  }
}

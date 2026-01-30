import { NextRequest, NextResponse } from 'next/server';
import { edificioManager } from '@/lib/fileManager';

// GET Pueblo Edificio summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all edificios for this pueblo
    const edificios = edificioManager.getByPuebloId(id);

    // ✅ Get eventos_recientes from each edificio
    const edificiosWithSummaries = edificios
      .map(edificio => {
        const eventosRecientes = edificio.eventos_recientes || [];
        const consolidatedSummary = eventosRecientes.length > 0
          ? eventosRecientes.join('\n')
          : '';

        return {
          edificioId: edificio.id,
          edificioName: edificio.name,
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(e => e.consolidatedSummary !== '');

    return NextResponse.json({
      success: true,
      data: {
        edificios: edificiosWithSummaries
      }
    });
  } catch (error) {
    console.error('Error fetching pueblo edificio summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pueblo edificio summaries' },
      { status: 500 }
    );
  }
}

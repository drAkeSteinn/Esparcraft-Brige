import { NextRequest, NextResponse } from 'next/server';
import { edificioManager, edificioStateManager } from '@/lib/fileManager';

// GET Pueblo Edificio summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all edificios for this pueblo
    const edificios = edificioManager.getByPuebloId(id);

    // Get summaries for each edificio
    const edificiosWithSummaries = edificios
      .map(edificio => {
        const memory = edificioStateManager.getMemory(edificio.id);
        const consolidatedSummary = memory?.consolidatedSummary || null;
        
        return {
          edificioId: edificio.id,
          edificioName: edificio.name,
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(e => e.consolidatedSummary !== null);

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

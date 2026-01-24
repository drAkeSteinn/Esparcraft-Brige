import { NextRequest, NextResponse } from 'next/server';
import { puebloManager, puebloStateManager } from '@/lib/fileManager';

// GET World Pueblo summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all pueblos for this world
    const pueblos = puebloManager.getByWorldId(id);

    // Get summaries for each pueblo
    const pueblosWithSummaries = pueblos
      .map(pueblo => {
        const memory = puebloStateManager.getMemory(pueblo.id);
        const consolidatedSummary = memory?.consolidatedSummary || null;
        
        return {
          puebloId: pueblo.id,
          puebloName: pueblo.name,
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(p => p.consolidatedSummary !== null);

    return NextResponse.json({
      success: true,
      data: {
        pueblos: pueblosWithSummaries
      }
    });
  } catch (error) {
    console.error('Error fetching world pueblo summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world pueblo summaries' },
      { status: 500 }
    );
  }
}

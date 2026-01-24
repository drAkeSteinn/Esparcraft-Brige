import { NextRequest, NextResponse } from 'next/server';
import { npcManager, summaryManager } from '@/lib/fileManager';

// GET Edificio NPC summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all NPCs for this edificio
    const npcs = npcManager.getByEdificioId(id);

    // Get summaries for each NPC
    const npcsWithSummaries = npcs
      .map(npc => {
        const memory = npcManager.getById(npc.id);
        const consolidatedSummary = memory?.id ? npc.id : null;
        
        return {
          npcId: npc.id,
          npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
          consolidatedSummary: consolidatedSummary
        };
      })
      .filter(n => n.consolidatedSummary !== null);

    return NextResponse.json({
      success: true,
      data: {
        npcs: npcsWithSummaries
      }
    });
  } catch (error) {
    console.error('Error fetching edificio NPC summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edificio NPC summaries' },
      { status: 500 }
    );
  }
}

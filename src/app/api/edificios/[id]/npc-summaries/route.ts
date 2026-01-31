import { NextRequest, NextResponse } from 'next/server';
import { npcDbManager } from '@/lib/npcDbManager';

// GET Edificio NPC summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all NPCs for this edificio
    const npcs = await npcDbManager.getByEdificioId(id);

    // ✅ Get creator_notes from each NPC (consolidated summaries)
    const npcsWithSummaries = npcs
      .map(npc => {
        const creatorNotes = npc?.card?.data?.creator_notes || '';

        return {
          npcId: npc.id,
          npcName: npc.card?.data?.name || npc.card?.name || 'Unknown',
          consolidatedSummary: creatorNotes
        };
      })
      .filter(n => n.consolidatedSummary !== '');

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

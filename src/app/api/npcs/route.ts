import { NextRequest, NextResponse } from 'next/server';
import { npcManager } from '@/lib/fileManager';
import { getCardField } from '@/lib/types';

// GET all NPCs or filter by location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');
    const puebloId = searchParams.get('puebloId');
    const edificioId = searchParams.get('edificioId');

    let npcs;
    if (edificioId) {
      npcs = npcManager.getByLocation(worldId || '', puebloId || '', edificioId);
    } else if (puebloId) {
      npcs = npcManager.getByLocation(worldId || '', puebloId);
    } else if (worldId) {
      npcs = npcManager.getByLocation(worldId);
    } else {
      npcs = npcManager.getAll();
    }

    return NextResponse.json({
      success: true,
      data: npcs
    });
  } catch (error) {
    console.error('Error fetching NPCs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NPCs' },
      { status: 500 }
    );
  }
}

// POST create NPC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.location || !body.location.worldId || !body.card) {
      return NextResponse.json(
        { error: 'Missing required fields: location.worldId, card' },
        { status: 400 }
      );
    }

    // Get name from card (supports both v3 format and legacy format)
    const cardName = getCardField(body.card, 'name', '');

    if (!cardName) {
      return NextResponse.json(
        { error: 'Missing required field: card.name or card.data.name' },
        { status: 400 }
      );
    }

    const npcData = {
      location: body.location,
      card: body.card
    };

    const newNPC = npcManager.create(npcData, body.id);

    return NextResponse.json({
      success: true,
      data: newNPC
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating NPC:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create NPC' },
      { status: 500 }
    );
  }
}

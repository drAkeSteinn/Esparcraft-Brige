import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/fileManager';

// GET all sessions or filter by npcId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const npcId = searchParams.get('npcId');

    let sessions;
    if (npcId) {
      sessions = sessionManager.getByNPCId(npcId);
    } else {
      sessions = sessionManager.getAll();
    }

    return NextResponse.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.npcId) {
      return NextResponse.json(
        { error: 'Missing required field: npcId' },
        { status: 400 }
      );
    }

    const sessionData = {
      npcId: body.npcId,
      playerId: body.playerId,
      messages: body.messages || [],
      summary: body.summary
    };

    const newSession = sessionManager.create(sessionData, body.id);

    return NextResponse.json({
      success: true,
      data: newSession
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

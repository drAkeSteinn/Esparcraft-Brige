import { NextRequest, NextResponse } from 'next/server';
import { npcManager } from '@/lib/fileManager';

// GET specific NPC
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const npc = npcManager.getById(id);

    if (!npc) {
      return NextResponse.json(
        { error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: npc
    });
  } catch (error) {
    console.error('Error fetching NPC:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NPC' },
      { status: 500 }
    );
  }
}

// PUT update NPC
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedNPC = npcManager.update(id, body);

    if (!updatedNPC) {
      return NextResponse.json(
        { error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedNPC
    });
  } catch (error) {
    console.error('Error updating NPC:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update NPC' },
      { status: 500 }
    );
  }
}

// DELETE NPC
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = npcManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'NPC deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting NPC:', error);
    return NextResponse.json(
      { error: 'Failed to delete NPC' },
      { status: 500 }
    );
  }
}

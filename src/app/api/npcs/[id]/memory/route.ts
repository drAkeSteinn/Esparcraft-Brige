import { NextRequest, NextResponse } from 'next/server';
import { npcStateManager } from '@/lib/fileManager';

// GET NPC memory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memory = npcStateManager.getMemory(id);

    if (!memory) {
      return NextResponse.json({
        success: true,
        data: {
          memory: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        memory
      }
    });
  } catch (error) {
    console.error('Error fetching NPC memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NPC memory' },
      { status: 500 }
    );
  }
}

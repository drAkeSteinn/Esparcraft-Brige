import { NextRequest, NextResponse } from 'next/server';
import { worldStateManager } from '@/lib/fileManager';

// GET World memory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memory = worldStateManager.getMemory(id);

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
    console.error('Error fetching world memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world memory' },
      { status: 500 }
    );
  }
}

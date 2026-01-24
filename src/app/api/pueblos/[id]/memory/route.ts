import { NextRequest, NextResponse } from 'next/server';
import { puebloStateManager } from '@/lib/fileManager';

// GET Pueblo memory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memory = puebloStateManager.getMemory(id);

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
    console.error('Error fetching pueblo memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pueblo memory' },
      { status: 500 }
    );
  }
}

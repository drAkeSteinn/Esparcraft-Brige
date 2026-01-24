import { NextRequest, NextResponse } from 'next/server';
import { edificioStateManager } from '@/lib/fileManager';

// GET Edificio memory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memory = edificioStateManager.getMemory(id);

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
    console.error('Error fetching edificio memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edificio memory' },
      { status: 500 }
    );
  }
}

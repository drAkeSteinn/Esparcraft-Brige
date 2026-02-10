import { NextRequest, NextResponse } from 'next/server';
import { worldDbManager } from '@/lib/worldDbManager';

// GET specific world
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const world = await worldDbManager.getById(id);

    if (!world) {
      return NextResponse.json(
        { error: 'World not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: world
    });
  } catch (error) {
    console.error('Error fetching world:', error);
    return NextResponse.json(
      { error: 'Failed to fetch world' },
      { status: 500 }
    );
  }
}

// PUT update world
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedWorld = await worldDbManager.update(id, body);

    if (!updatedWorld) {
      return NextResponse.json(
        { error: 'World not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedWorld
    });
  } catch (error) {
    console.error('Error updating world:', error);
    return NextResponse.json(
      { error: 'Failed to update world' },
      { status: 500 }
    );
  }
}

// DELETE world
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('DELETE /api/worlds/[id] - ID recibido:', id);
    const success = await worldDbManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'World not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'World deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting world:', error);
    return NextResponse.json(
      { error: 'Failed to delete world' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';

// GET specific pueblo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pueblo = await puebloDbManager.getById(id);

    if (!pueblo) {
      return NextResponse.json(
        { error: 'Pueblo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pueblo
    });
  } catch (error) {
    console.error('Error fetching pueblo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pueblo' },
      { status: 500 }
    );
  }
}

// PUT update pueblo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedPueblo = await puebloDbManager.update(id, body);

    if (!updatedPueblo) {
      return NextResponse.json(
        { error: 'Pueblo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPueblo
    });
  } catch (error) {
    console.error('Error updating pueblo:', error);
    return NextResponse.json(
      { error: 'Failed to update pueblo' },
      { status: 500 }
    );
  }
}

// DELETE pueblo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await puebloDbManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Pueblo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pueblo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pueblo:', error);
    return NextResponse.json(
      { error: 'Failed to delete pueblo' },
      { status: 500 }
    );
  }
}

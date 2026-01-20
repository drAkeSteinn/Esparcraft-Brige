import { NextRequest, NextResponse } from 'next/server';
import { placeTypeManager } from '@/lib/fileManager';

// GET place type by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const placeType = placeTypeManager.getById(params.id);

    if (!placeType) {
      return NextResponse.json(
        { error: 'Place type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: placeType
    });
  } catch (error) {
    console.error('Error fetching place type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place type' },
      { status: 500 }
    );
  }
}

// PUT update place type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if place type exists
    const existing = placeTypeManager.getById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Place type not found' },
        { status: 404 }
      );
    }

    const updated = placeTypeManager.update(params.id, {
      name: body.name,
      icon: body.icon,
      color: body.color
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating place type:', error);
    return NextResponse.json(
      { error: 'Failed to update place type' },
      { status: 500 }
    );
  }
}

// DELETE place type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if place type exists
    const existing = placeTypeManager.getById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Place type not found' },
        { status: 404 }
      );
    }

    // Check if place type is in use
    const isInUse = placeTypeManager.isInUse(params.id);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Cannot delete: this place type is in use by one or more points of interest' },
        { status: 409 }
      );
    }

    const deleted = placeTypeManager.delete(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete place type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Place type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting place type:', error);
    return NextResponse.json(
      { error: 'Failed to delete place type' },
      { status: 500 }
    );
  }
}

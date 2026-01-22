import { NextRequest, NextResponse } from 'next/server';
import { edificioManager } from '@/lib/fileManager';

// GET specific edificio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const edificio = edificioManager.getById(id);

    if (!edificio) {
      return NextResponse.json(
        { error: 'Edificio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: edificio
    });
  } catch (error) {
    console.error('Error fetching edificio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edificio' },
      { status: 500 }
    );
  }
}

// PUT update edificio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedEdificio = edificioManager.update(id, body);

    if (!updatedEdificio) {
      return NextResponse.json(
        { error: 'Edificio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedEdificio
    });
  } catch (error) {
    console.error('Error updating edificio:', error);
    return NextResponse.json(
      { error: 'Failed to update edificio' },
      { status: 500 }
    );
  }
}

// DELETE edificio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = edificioManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Edificio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Edificio deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting edificio:', error);
    return NextResponse.json(
      { error: 'Failed to delete edificio' },
      { status: 500 }
    );
  }
}

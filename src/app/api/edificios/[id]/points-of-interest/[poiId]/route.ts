import { NextRequest, NextResponse } from 'next/server';
import { edificioManager, pointOfInterestManager } from '@/lib/fileManager';

// PUT update point of interest
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; poiId: string } }
) {
  try {
    const body = await request.json();

    // Check if edificio exists
    const edificio = edificioManager.getById(params.id);
    if (!edificio || !edificio.puntosDeInteres) {
      return NextResponse.json(
        { error: 'Edificio or POI not found' },
        { status: 404 }
      );
    }

    // Check if POI exists
    const poi = edificio.puntosDeInteres.find(p => p.id === params.poiId);
    if (!poi) {
      return NextResponse.json(
        { error: 'Point of interest not found' },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.coordenadas !== undefined) updates.coordenadas = body.coordenadas;
    if (body.descripcion !== undefined) updates.descripcion = body.descripcion;
    if (body.tipo !== undefined) updates.tipo = body.tipo;
    if (body.imagen !== undefined) updates.imagen = body.imagen;
    if (body.tags !== undefined) updates.tags = body.tags;

    const updatedEdificio = pointOfInterestManager.updateInEdificio(params.id, params.poiId, updates);

    if (!updatedEdificio) {
      return NextResponse.json(
        { error: 'Failed to update POI' },
        { status: 500 }
      );
    }

    // Return the updated POI
    const updatedPOI = updatedEdificio.puntosDeInteres?.find(p => p.id === params.poiId);

    return NextResponse.json({
      success: true,
      data: updatedPOI
    });
  } catch (error) {
    console.error('Error updating POI:', error);
    return NextResponse.json(
      { error: 'Failed to update point of interest' },
      { status: 500 }
    );
  }
}

// DELETE point of interest
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; poiId: string } }
) {
  try {
    // Check if edificio exists
    const edificio = edificioManager.getById(params.id);
    if (!edificio || !edificio.puntosDeInteres) {
      return NextResponse.json(
        { error: 'Edificio or POI not found' },
        { status: 404 }
      );
    }

    // Check if POI exists
    const poi = edificio.puntosDeInteres.find(p => p.id === params.poiId);
    if (!poi) {
      return NextResponse.json(
        { error: 'Point of interest not found' },
        { status: 404 }
      );
    }

    // Delete POI image if exists
    if (poi.imagen) {
      pointOfInterestManager.deleteImage(params.id, params.poiId);
    }

    const updatedEdificio = pointOfInterestManager.removeFromEdificio(params.id, params.poiId);

    if (!updatedEdificio) {
      return NextResponse.json(
        { error: 'Failed to delete POI' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Point of interest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting POI:', error);
    return NextResponse.json(
      { error: 'Failed to delete point of interest' },
      { status: 500 }
    );
  }
}

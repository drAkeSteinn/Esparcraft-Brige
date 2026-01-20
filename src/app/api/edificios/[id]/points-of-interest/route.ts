import { NextRequest, NextResponse } from 'next/server';
import { edificioManager, pointOfInterestManager } from '@/lib/fileManager';

// GET all points of interest for an edificio
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const edificio = edificioManager.getById(params.id);

    if (!edificio) {
      return NextResponse.json(
        { error: 'Edificio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: edificio.puntosDeInteres || []
    });
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points of interest' },
      { status: 500 }
    );
  }
}

// POST create point of interest
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.tipo || !body.descripcion || !body.coordenadas) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tipo, descripcion, coordenadas' },
        { status: 400 }
      );
    }

    const poiData = {
      name: body.name,
      coordenadas: body.coordenadas,
      descripcion: body.descripcion,
      tipo: body.tipo,
      imagen: body.imagen, // optional
      tags: body.tags // optional
    };

    const updatedEdificio = pointOfInterestManager.addToEdificio(params.id, poiData);

    if (!updatedEdificio) {
      return NextResponse.json(
        { error: 'Edificio not found' },
        { status: 404 }
      );
    }

    // Return the new POI (last one in the array)
    const newPOI = updatedEdificio.puntosDeInteres?.[updatedEdificio.puntosDeInteres.length - 1];

    return NextResponse.json({
      success: true,
      data: newPOI
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating POI:', error);
    return NextResponse.json(
      { error: 'Failed to create point of interest' },
      { status: 500 }
    );
  }
}

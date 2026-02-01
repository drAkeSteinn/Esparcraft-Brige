import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';

// GET all edificios or filter by worldId or puebloId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');
    const puebloId = searchParams.get('puebloId');

    let edificios;
    if (puebloId) {
      edificios = await edificioDbManager.getByPuebloId(puebloId);
    } else if (worldId) {
      edificios = await edificioDbManager.getByWorldId(worldId);
    } else {
      edificios = await edificioDbManager.getAll();
    }

    return NextResponse.json({
      success: true,
      data: edificios
    });
  } catch (error) {
    console.error('Error fetching edificios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edificios' },
      { status: 500 }
    );
  }
}

// POST create edificio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.worldId || !body.puebloId || !body.name || !body.area) {
      return NextResponse.json(
        { error: 'Missing required fields: worldId, puebloId, name, area' },
        { status: 400 }
      );
    }

    const edificioData = {
      worldId: body.worldId,
      puebloId: body.puebloId,
      name: body.name,
      lore: body.lore || '',
      eventos_recientes: body.eventos_recientes || [],
      area: body.area
    };

    const newEdificio = await edificioDbManager.create(edificioData, body.id);

    return NextResponse.json({
      success: true,
      data: newEdificio
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating edificio:', error);
    return NextResponse.json(
      { error: 'Failed to create edificio' },
      { status: 500 }
    );
  }
}

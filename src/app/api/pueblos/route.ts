import { NextRequest, NextResponse } from 'next/server';
import { puebloManager } from '@/lib/fileManager';

// GET all pueblos or filter by worldId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');

    let pueblos;
    if (worldId) {
      pueblos = puebloManager.getByWorldId(worldId);
    } else {
      pueblos = puebloManager.getAll();
    }

    return NextResponse.json({
      success: true,
      data: pueblos
    });
  } catch (error) {
    console.error('Error fetching pueblos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pueblos' },
      { status: 500 }
    );
  }
}

// POST create pueblo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.worldId || !body.name || !body.type || !body.description || !body.lore || !body.lore.estado_pueblo) {
      return NextResponse.json(
        { error: 'Missing required fields: worldId, name, type, description, lore.estado_pueblo' },
        { status: 400 }
      );
    }

    // Validate type
    if (body.type !== 'pueblo' && body.type !== 'nacion') {
      return NextResponse.json(
        { error: 'Invalid type: must be "pueblo" or "nacion"' },
        { status: 400 }
      );
    }

    const puebloData = {
      worldId: body.worldId,
      name: body.name,
      type: body.type as 'pueblo' | 'nacion',
      description: body.description,
      lore: {
        estado_pueblo: body.lore.estado_pueblo,
        rumores: body.lore.rumores || [],
        eventos: body.lore.eventos || []
      }
    };

    const newPueblo = puebloManager.create(puebloData, body.id);

    return NextResponse.json({
      success: true,
      data: newPueblo
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating pueblo:', error);
    return NextResponse.json(
      { error: 'Failed to create pueblo' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { worldManager } from '@/lib/fileManager';
import { World } from '@/lib/types';

// GET all worlds
export async function GET() {
  try {
    const worlds = worldManager.getAll();
    return NextResponse.json({
      success: true,
      data: worlds
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worlds' },
      { status: 500 }
    );
  }
}

// POST create world
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.lore || !body.lore.estado_mundo) {
      return NextResponse.json(
        { error: 'Missing required fields: name, lore.estado_mundo' },
        { status: 400 }
      );
    }

    const worldData = {
      name: body.name,
      lore: {
        estado_mundo: body.lore.estado_mundo,
        rumores: body.lore.rumores || [],
        eventos: body.lore.eventos || []
      }
    };

    const newWorld = worldManager.create(worldData, body.id);

    return NextResponse.json({
      success: true,
      data: newWorld
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating world:', error);
    return NextResponse.json(
      { error: 'Failed to create world' },
      { status: 500 }
    );
  }
}

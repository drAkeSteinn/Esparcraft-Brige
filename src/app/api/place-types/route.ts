import { NextRequest, NextResponse } from 'next/server';
import { placeTypeDbManager } from '@/lib/placeTypeDbManager';

// GET all place types
export async function GET() {
  try {
    const placeTypes = await placeTypeDbManager.getAll();

    return NextResponse.json({
      success: true,
      data: placeTypes
    });
  } catch (error) {
    console.error('Error fetching place types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place types' },
      { status: 500 }
    );
  }
}

// POST create place type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.icon) {
      return NextResponse.json(
        { error: 'Missing required fields: name, icon' },
        { status: 400 }
      );
    }

    const placeTypeData = {
      name: body.name,
      icon: body.icon,
      color: body.color // optional
    };

    const newPlaceType = await placeTypeDbManager.create(placeTypeData, body.id);

    return NextResponse.json({
      success: true,
      data: newPlaceType
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating place type:', error);
    return NextResponse.json(
      { error: 'Failed to create place type' },
      { status: 500 }
    );
  }
}

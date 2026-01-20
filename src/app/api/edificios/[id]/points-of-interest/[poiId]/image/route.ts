import { NextRequest, NextResponse } from 'next/server';
import { edificioManager, pointOfInterestManager } from '@/lib/fileManager';

// POST upload/update POI image
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; poiId: string } }
) {
  try {
    // Check if edificio and POI exist
    const edificio = edificioManager.getById(params.id);
    if (!edificio || !edificio.puntosDeInteres) {
      return NextResponse.json(
        { error: 'Edificio or POI not found' },
        { status: 404 }
      );
    }

    const poi = edificio.puntosDeInteres.find(p => p.id === params.poiId);
    if (!poi) {
      return NextResponse.json(
        { error: 'Point of interest not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save image
    pointOfInterestManager.saveImage(params.id, params.poiId, buffer);

    // Update POI with image path
    const imagePath = `/api/edificios/${params.id}/points-of-interest/${params.poiId}/image`;
    const updatedEdificio = pointOfInterestManager.updateInEdificio(params.id, params.poiId, {
      imagen: imagePath
    });

    if (!updatedEdificio) {
      return NextResponse.json(
        { error: 'Failed to update POI with image path' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        imagePath,
        message: 'Image uploaded successfully'
      }
    });
  } catch (error) {
    console.error('Error uploading POI image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// GET POI image
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; poiId: string } }
) {
  try {
    const fs = require('fs');
    const path = require('path');

    const imagePath = pointOfInterestManager.getImagePath(params.id, params.poiId);

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const imageBuffer = fs.readFileSync(imagePath);

    // Determine content type based on file extension
    const ext = path.extname(imagePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' :
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.gif' ? 'image/gif' :
                       ext === '.webp' ? 'image/webp' :
                       'image/png';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    });
  } catch (error) {
    console.error('Error fetching POI image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

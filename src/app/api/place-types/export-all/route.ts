import { NextRequest, NextResponse } from 'next/server';
import { placeTypeDbManager } from '@/lib/placeTypeDbManager';
import { createHash } from 'crypto';

// GET - Exporta todos los tipos de lugares como archivo JSON
export async function GET() {
  try {
    // Obtener todos los tipos de lugares
    const placeTypes = await placeTypeDbManager.getAll();

    // Calcular checksum del contenido
    const placeTypesString = JSON.stringify(placeTypes, null, 2);
    const checksum = createHash('sha256').update(placeTypesString).digest('hex');

    // Crear metadatos del archivo
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'place-types' as const,
      itemCount: placeTypes.length,
      checksum,
      items: placeTypes
    };

    // Retornar el archivo como descarga
    const fileName = `place-types-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error exporting place types:', error);
    return NextResponse.json(
      { error: 'Failed to export place types' },
      { status: 500 }
    );
  }
}

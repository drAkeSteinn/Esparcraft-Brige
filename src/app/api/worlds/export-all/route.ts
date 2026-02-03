import { NextRequest, NextResponse } from 'next/server';
import { worldDbManager } from '@/lib/worldDbManager';
import { createHash } from 'crypto';

// GET - Exporta todos los mundos como archivo JSON
export async function GET() {
  try {
    // Obtener todos los mundos
    const worlds = await worldDbManager.getAll();

    // Calcular checksum del contenido
    const worldsString = JSON.stringify(worlds, null, 2);
    const checksum = createHash('sha256').update(worldsString).digest('hex');

    // Crear metadatos del archivo
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'worlds' as const,
      itemCount: worlds.length,
      checksum,
      items: worlds
    };

    // Retornar el archivo como descarga
    const fileName = `worlds-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error exporting worlds:', error);
    return NextResponse.json(
      { error: 'Failed to export worlds' },
      { status: 500 }
    );
  }
}

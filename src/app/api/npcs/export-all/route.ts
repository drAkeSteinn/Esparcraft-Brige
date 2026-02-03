import { NextRequest, NextResponse } from 'next/server';
import { npcDbManager } from '@/lib/npcDbManager';
import { createHash } from 'crypto';

// GET - Exporta todos los NPCs como archivo JSON
export async function GET() {
  try {
    // Obtener todos los NPCs
    const npcs = await npcDbManager.getAll();

    // Calcular checksum del contenido
    const npcsString = JSON.stringify(npcs, null, 2);
    const checksum = createHash('sha256').update(npcsString).digest('hex');

    // Crear metadatos del archivo
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      npcCount: npcs.length,
      checksum,
      npcs
    };

    // Retornar el archivo como descarga
    const fileName = `npcs-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error exporting NPCs:', error);
    return NextResponse.json(
      { error: 'Failed to export NPCs' },
      { status: 500 }
    );
  }
}

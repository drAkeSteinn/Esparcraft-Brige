import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { createHash } from 'crypto';

// GET - Exportar todos los pueblos
export async function GET() {
  try {
    const pueblos = await puebloDbManager.getAll();

    if (pueblos.length === 0) {
      return NextResponse.json(
        { error: 'No pueblos to export' },
        { status: 400 }
      );
    }

    // Calcular checksum del contenido
    const pueblosString = JSON.stringify(pueblos, null, 2);
    const checksum = createHash('sha256').update(pueblosString).digest('hex');

    // Crear payload de exportación con metadatos
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'pueblos' as const,
      itemCount: pueblos.length,
      checksum,
      items: pueblos
    };

    // Retornar como descarga
    const fileName = `pueblos-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('[API:pueblos/export-all] Error exporting all pueblos:', error);
    return NextResponse.json(
      { error: 'Failed to export pueblos' },
      { status: 500 }
    );
  }
}

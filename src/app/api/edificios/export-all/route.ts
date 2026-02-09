import { NextRequest, NextResponse } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { createHash } from 'crypto';

// GET - Exportar todos los edificios
export async function GET() {
  try {
    const edificios = await edificioDbManager.getAll();

    if (edificios.length === 0) {
      return NextResponse.json(
        { error: 'No edificios to export' },
        { status: 400 }
      );
    }

    // Calcular checksum del contenido
    const edificiosString = JSON.stringify(edificios, null, 2);
    const checksum = createHash('sha256').update(edificiosString).digest('hex');

    // Crear payload de exportación con metadatos
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'edificios' as const,
      itemCount: edificios.length,
      checksum,
      items: edificios
    };

    // Retornar como descarga
    const fileName = `edificios-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('[API:edificios/export-all] Error exporting all edificios:', error);
    return NextResponse.json(
      { error: 'Failed to export edificios' },
      { status: 500 }
    );
  }
}

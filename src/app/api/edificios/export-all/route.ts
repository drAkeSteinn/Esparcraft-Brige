import { NextRequest, NextResponse } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';

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

    // Crear payload de exportación con metadatos
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      itemType: 'edificios',
      items: edificios
    };

    // Retornar como descarga
    const content = JSON.stringify(exportData, null, 2);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="edificios-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
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

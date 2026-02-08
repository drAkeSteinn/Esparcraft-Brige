import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';

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

    // Crear payload de exportación con metadatos
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      itemType: 'pueblos',
      items: pueblos
    };

    // Retornar como descarga
    const content = JSON.stringify(exportData, null, 2);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pueblos-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
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

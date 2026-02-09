import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { createHash } from 'crypto';

// GET - Exporta todos los pueblos como archivo JSON
export async function GET() {
  try {
    const pueblos = await puebloDbManager.getAll();
    const pueblosString = JSON.stringify(pueblos, null, 2);
    const checksum = createHash('sha256').update(pueblosString).digest('hex');

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'pueblos' as const,
      itemCount: pueblos.length,
      checksum,
      items: pueblos
    };

    const fileName = `pueblos-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error exporting pueblos:', error);
    return NextResponse.json(
      { error: 'Failed to export pueblos' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { createHash } from 'crypto';

export async function GET() {
  try {
    const edificios = await edificioDbManager.getAll();
    const edificiosString = JSON.stringify(edificios, null, 2);
    const checksum = createHash('sha256').update(edificiosString).digest('hex');

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      entityType: 'edificios' as const,
      itemCount: edificios.length,
      checksum,
      items: edificios
    };

    const fileName = `edificios-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error exporting edificios:', error);
    return NextResponse.json(
      { error: 'Failed to export edificios' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup
} from '@/lib/genericBackupManager';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { createGenericBackup } from '@/lib/genericBackupManager';
import { Edificio } from '@/lib/types';

interface RouteContext {
  params: {
    filename: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const content = await downloadGenericBackup('edificios', decodedFilename);

    if (!content) {
      return NextResponse.json(
        { error: 'Backup not found or corrupted' },
        { status: 404 }
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${decodedFilename}"`
      }
    });
  } catch (error) {
    console.error('Error downloading edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const edificios = await getGenericBackup<Edificio>('edificios', decodedFilename);

    if (!edificios) {
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    const currentEdificios = await edificioDbManager.getAll();
    if (currentEdificios.length > 0) {
      await createGenericBackup('edificios', currentEdificios, 'auto', `pre-restore-${Date.now()}`);
    }

    await edificioDbManager.deleteAll();

    for (const item of edificios) {
      await edificioDbManager.create(
        {
          worldId: item.worldId,
          puebloId: item.puebloId,
          name: item.name,
          lore: item.lore,
          rumores: item.rumores,
          eventos_recientes: item.eventos_recientes,
          area: item.area,
          puntosDeInteres: item.puntosDeInteres
        },
        item.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully with ${edificios.length} edificios`,
      data: {
        itemCount: edificios.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('Error restoring edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const success = await deleteGenericBackup('edificios', decodedFilename);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete backup' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup
} from '@/lib/genericBackupManager';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { createGenericBackup } from '@/lib/genericBackupManager';
import { Pueblo } from '@/lib/types';

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

    const content = await downloadGenericBackup('pueblos', decodedFilename);

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
    console.error('Error downloading pueblo backup:', error);
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

    const pueblos = await getGenericBackup<Pueblo>('pueblos', decodedFilename);

    if (!pueblos) {
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    const currentPueblos = await puebloDbManager.getAll();
    if (currentPueblos.length > 0) {
      await createGenericBackup('pueblos', currentPueblos, 'auto', `pre-restore-${Date.now()}`);
    }

    await puebloDbManager.deleteAll();

    for (const item of pueblos) {
      await puebloDbManager.create(
        {
          worldId: item.worldId,
          name: item.name,
          type: item.type,
          description: item.description,
          lore: item.lore,
          area: item.area
        },
        item.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully with ${pueblos.length} pueblos`,
      data: {
        itemCount: pueblos.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('Error restoring pueblo backup:', error);
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

    const success = await deleteGenericBackup('pueblos', decodedFilename);

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
    console.error('Error deleting pueblo backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

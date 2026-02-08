import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup
} from '@/lib/genericBackupManager';
import { worldDbManager } from '@/lib/worldDbManager';
import { createGenericBackup } from '@/lib/genericBackupManager';
import { World } from '@/lib/types';

interface RouteContext {
  params: {
    filename: string;
  };
}

// GET - Descargar un backup específico de mundos
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const content = await downloadGenericBackup('worlds', decodedFilename);

    if (!content) {
      return NextResponse.json(
        { error: 'Backup not found or corrupted' },
        { status: 404 }
      );
    }

    // Retornar como descarga
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${decodedFilename}"`
      }
    });
  } catch (error) {
    console.error('Error downloading world backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

// POST - Restaurar un backup específico de mundos
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const worlds = await getGenericBackup<World>('worlds', decodedFilename);

    if (!worlds) {
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    // Crear backup automático del estado actual antes de restaurar
    const currentWorlds = await worldDbManager.getAll();
    if (currentWorlds.length > 0) {
      await createGenericBackup('worlds', currentWorlds, 'auto', `pre-restore-${Date.now()}`);
    }

    // Borrar todos los mundos actuales
    await worldDbManager.deleteAll();

    // Importar mundos del backup
    for (const world of worlds) {
      await worldDbManager.create(
        {
          name: world.name,
          lore: world.lore,
          area: world.area
        },
        world.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully with ${worlds.length} worlds`,
      data: {
        itemCount: worlds.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('Error restoring world backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un backup específico de mundos
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);
    console.log(`[API:worlds/backups] Eliminando backup: ${decodedFilename}`);

    const success = await deleteGenericBackup('worlds', decodedFilename);
    console.log(`[API:worlds/backups] deleteGenericBackup result: ${success}`);

    if (!success) {
      console.error(`[API:worlds/backups] No se pudo eliminar el backup: ${decodedFilename}`);
      return NextResponse.json(
        { error: 'Failed to delete backup' },
        { status: 400 }
      );
    }

    console.log(`[API:worlds/backups] Backup eliminado exitosamente: ${decodedFilename}`);
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('[API:worlds/backups] Error deleting world backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

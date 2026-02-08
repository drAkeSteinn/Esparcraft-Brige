import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup
} from '@/lib/genericBackupManager';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { Pueblo } from '@/lib/types';

interface RouteContext {
  params: {
    filename: string;
  };
}

// GET - Descargar un backup específico de pueblos
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

    // Retornar como descarga
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${decodedFilename}"`
      }
    });
  } catch (error) {
    console.error('[API:pueblos/backups] Error downloading pueblo backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

// POST - Restaurar un backup específico de pueblos
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const pueblos = await getGenericBackup<Pueblo>('pueblos', decodedFilename);

    if (!pueblos) {
      console.error(`[API:pueblos/backups] No se pudo leer el backup o no hay coincidencia de checksum: ${decodedFilename}`);
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    // Crear backup automático del estado actual antes de restaurar
    const currentPueblos = await puebloDbManager.getAll();
    if (currentPueblos.length > 0) {
      await createGenericBackup('pueblos', currentPueblos, 'auto', `pre-restore-${Date.now()}`);
    }

    // Borrar todos los pueblos actuales
    await puebloDbManager.deleteAll();

    // Importar pueblos del backup
    for (const pueblo of pueblos) {
      await puebloDbManager.create(
        {
          name: pueblo.name,
          type: pueblo.type,
          description: pueblo.description,
          worldId: pueblo.worldId,
          lore: pueblo.lore,
          area: pueblo.area ? JSON.parse(pueblo.area) : undefined
        },
        pueblo.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restaurado exitosamente con ${pueblos.length} pueblos`,
      data: {
        itemCount: pueblos.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('[API:pueblos/backups] Error restoring pueblo backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un backup específico de pueblos
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);
    console.log(`[API:pueblos/backups] Eliminando backup: ${decodedFilename}`);

    const success = await deleteGenericBackup('pueblos', decodedFilename);
    console.log(`[API:pueblos/backups] deleteGenericBackup result: ${success}`);

    if (!success) {
      console.error(`[API:pueblos/backups] No se pudo eliminar el backup: ${decodedFilename}`);
      return NextResponse.json(
        { error: 'Failed to delete backup' },
        { status: 400 }
      );
    }

    console.log(`[API:pueblos/backups] Backup eliminado exitosamente: ${decodedFilename}`);
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('[API:pueblos/backups] Error deleting pueblo backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

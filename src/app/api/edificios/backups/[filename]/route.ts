import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup,
  createGenericBackup
} from '@/lib/genericBackupManager';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { Edificio } from '@/lib/types';

interface RouteContext {
  params: {
    filename: string;
  };
}

// GET - Descargar un backup específico de edificios
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);

    const content = await downloadGenericBackup('edificios', decodedFilename);

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
    console.error('[API:edificios/backups] Error downloading edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

// POST - Restaurar un backup específico de edificios
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);

    const edificios = await getGenericBackup<Edificio>('edificios', decodedFilename);

    if (!edificios) {
      console.error(`[API:edificios/backups] No se pudo leer el backup o no hay coincidencia de checksum: ${decodedFilename}`);
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    // Crear backup automático del estado actual antes de restaurar
    const currentEdificios = await edificioDbManager.getAll();
    if (currentEdificios.length > 0) {
      await createGenericBackup('edificios', currentEdificios, 'auto', `pre-restore-${Date.now()}`);
    }

    // Borrar todos los edificios actuales
    await edificioDbManager.deleteAll();

    // Importar edificios del backup
    for (const edificio of edificios) {
      await edificioDbManager.create(
        {
          name: edificio.name,
          description: edificio.description,
          worldId: edificio.worldId,
          puebloId: edificio.puebloId,
          lore: edificio.lore,
          area: edificio.area || undefined
        },
        edificio.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restaurado exitosamente con ${edificios.length} edificios`,
      data: {
        itemCount: edificios.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('[API:edificios/backups] Error restoring edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un backup específico de edificios
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);
    console.log(`[API:edificios/backups] Eliminando backup: ${decodedFilename}`);

    const success = await deleteGenericBackup('edificios', decodedFilename);
    console.log(`[API:edificios/backups] deleteGenericBackup result: ${success}`);

    if (!success) {
      console.error(`[API:edificios/backups] No se pudo eliminar el backup: ${decodedFilename}`);
      return NextResponse.json(
        { error: 'Failed to delete backup' },
        { status: 400 }
      );
    }

    console.log(`[API:edificios/backups] Backup eliminado exitosamente: ${decodedFilename}`);
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('[API:edificios/backups] Error deleting edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getGenericBackup,
  deleteGenericBackup,
  downloadGenericBackup
} from '@/lib/genericBackupManager';
import { placeTypeDbManager } from '@/lib/placeTypeDbManager';
import { createGenericBackup } from '@/lib/genericBackupManager';
import { PlaceType } from '@/lib/types';

interface RouteContext {
  params: {
    filename: string;
  };
}

// GET - Descargar un backup específico de tipos de lugares
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const content = await downloadGenericBackup('place-types', decodedFilename);

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
    console.error('Error downloading place-type backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

// POST - Restaurar un backup específico de tipos de lugares
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const placeTypes = await getGenericBackup<PlaceType>('place-types', decodedFilename);

    if (!placeTypes) {
      return NextResponse.json(
        { error: 'Failed to read backup or checksum mismatch' },
        { status: 400 }
      );
    }

    // Crear backup automático del estado actual antes de restaurar
    const currentPlaceTypes = await placeTypeDbManager.getAll();
    if (currentPlaceTypes.length > 0) {
      await createGenericBackup('place-types', currentPlaceTypes, 'auto', `pre-restore-${Date.now()}`);
    }

    // Borrar todos los tipos de lugares actuales
    await placeTypeDbManager.deleteAll();

    // Importar tipos de lugares del backup
    for (const placeType of placeTypes) {
      await placeTypeDbManager.create(
        {
          name: placeType.name,
          icon: placeType.icon,
          color: placeType.color
        },
        placeType.id
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully with ${placeTypes.length} place types`,
      data: {
        itemCount: placeTypes.length,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('Error restoring place-type backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un backup específico de tipos de lugares
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = context.params;
    const decodedFilename = decodeURIComponent(filename);

    const success = await deleteGenericBackup('place-types', decodedFilename);

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
    console.error('Error deleting place-type backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

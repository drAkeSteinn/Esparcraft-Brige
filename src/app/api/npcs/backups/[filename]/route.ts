import { NextRequest, NextResponse } from 'next/server';
import {
  restoreBackup,
  deleteBackup,
  downloadBackup
} from '@/lib/npcBackupManager';

interface RouteContext {
  params: {
    filename: string;
  };
}

// GET - Descargar un backup específico
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);

    const content = await downloadBackup(decodedFilename);

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
    console.error('Error downloading backup:', error);
    return NextResponse.json(
      { error: 'Failed to download backup' },
      { status: 500 }
    );
  }
}

// POST - Restaurar un backup específico
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);

    const result = await restoreBackup(decodedFilename);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully with ${result.npcCount} NPCs`,
      data: {
        npcCount: result.npcCount,
        filename: decodedFilename
      }
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un backup específico
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);

    const success = await deleteBackup(decodedFilename);

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
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}

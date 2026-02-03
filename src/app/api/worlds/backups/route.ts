import { NextRequest, NextResponse } from 'next/server';
import {
  listGenericBackups,
  createGenericBackup,
  rotateGenericBackups,
  getBackupsTotalSize
} from '@/lib/genericBackupManager';
import { worldDbManager } from '@/lib/worldDbManager';

// GET - Listar todos los backups de mundos
export async function GET() {
  try {
    const backups = await listGenericBackups('worlds');
    const totalSize = await getBackupsTotalSize('worlds');

    return NextResponse.json({
      success: true,
      data: {
        backups,
        totalSize,
        count: backups.length
      }
    });
  } catch (error) {
    console.error('Error listing worlds backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo backup manual de mundos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rotate } = body;

    // Obtener todos los mundos actuales
    const worlds = await worldDbManager.getAll();

    if (worlds.length === 0) {
      return NextResponse.json(
        { error: 'No worlds to backup' },
        { status: 400 }
      );
    }

    // Crear backup
    const backup = await createGenericBackup('worlds', worlds, 'manual', name);

    // Rotar backups si se solicita
    if (rotate) {
      await rotateGenericBackups('worlds', 10);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating world backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

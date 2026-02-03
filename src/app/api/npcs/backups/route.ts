import { NextRequest, NextResponse } from 'next/server';
import {
  listBackups,
  createBackup,
  rotateBackups,
  getBackupsTotalSize
} from '@/lib/npcBackupManager';
import { npcDbManager } from '@/lib/npcDbManager';

// GET - Listar todos los backups
export async function GET() {
  try {
    const backups = await listBackups();
    const totalSize = await getBackupsTotalSize();

    return NextResponse.json({
      success: true,
      data: {
        backups,
        totalSize,
        count: backups.length
      }
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo backup manual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rotate } = body;

    // Obtener todos los NPCs actuales
    const npcs = await npcDbManager.getAll();

    if (npcs.length === 0) {
      return NextResponse.json(
        { error: 'No NPCs to backup' },
        { status: 400 }
      );
    }

    // Crear backup
    const backup = await createBackup(npcs, 'manual', name);

    // Rotar backups si se solicita
    if (rotate) {
      await rotateBackups(10); // Mantener máx 10 backups
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

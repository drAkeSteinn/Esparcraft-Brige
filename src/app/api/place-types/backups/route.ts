import { NextRequest, NextResponse } from 'next/server';
import {
  listGenericBackups,
  createGenericBackup,
  rotateGenericBackups,
  getBackupsTotalSize
} from '@/lib/genericBackupManager';
import { placeTypeDbManager } from '@/lib/placeTypeDbManager';

// GET - Listar todos los backups de tipos de lugares
export async function GET() {
  try {
    const backups = await listGenericBackups('place-types');
    const totalSize = await getBackupsTotalSize('place-types');

    return NextResponse.json({
      success: true,
      data: {
        backups,
        totalSize,
        count: backups.length
      }
    });
  } catch (error) {
    console.error('Error listing place-types backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo backup manual de tipos de lugares
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rotate } = body;

    // Obtener todos los tipos de lugares actuales
    const placeTypes = await placeTypeDbManager.getAll();

    if (placeTypes.length === 0) {
      return NextResponse.json(
        { error: 'No place types to backup' },
        { status: 400 }
      );
    }

    // Crear backup
    const backup = await createGenericBackup('place-types', placeTypes, 'manual', name);

    // Rotar backups si se solicita
    if (rotate) {
      await rotateGenericBackups('place-types', 10);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating place-type backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

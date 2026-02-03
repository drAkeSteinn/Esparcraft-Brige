import { NextRequest, NextResponse } from 'next/server';
import {
  listGenericBackups,
  createGenericBackup,
  rotateGenericBackups,
  getBackupsTotalSize
} from '@/lib/genericBackupManager';
import { edificioDbManager } from '@/lib/edificioDbManager';

export async function GET() {
  try {
    const backups = await listGenericBackups('edificios');
    const totalSize = await getBackupsTotalSize('edificios');

    return NextResponse.json({
      success: true,
      data: {
        backups,
        totalSize,
        count: backups.length
      }
    });
  } catch (error) {
    console.error('Error listing edificios backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rotate } = body;

    const edificios = await edificioDbManager.getAll();

    if (edificios.length === 0) {
      return NextResponse.json(
        { error: 'No edificios to backup' },
        { status: 400 }
      );
    }

    const backup = await createGenericBackup('edificios', edificios, 'manual', name);

    if (rotate) {
      await rotateGenericBackups('edificios', 10);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating edificio backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

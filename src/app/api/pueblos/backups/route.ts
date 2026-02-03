import { NextRequest, NextResponse } from 'next/server';
import {
  listGenericBackups,
  createGenericBackup,
  rotateGenericBackups,
  getBackupsTotalSize
} from '@/lib/genericBackupManager';
import { puebloDbManager } from '@/lib/puebloDbManager';

export async function GET() {
  try {
    const backups = await listGenericBackups('pueblos');
    const totalSize = await getBackupsTotalSize('pueblos');

    return NextResponse.json({
      success: true,
      data: {
        backups,
        totalSize,
        count: backups.length
      }
    });
  } catch (error) {
    console.error('Error listing pueblos backups:', error);
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

    const pueblos = await puebloDbManager.getAll();

    if (pueblos.length === 0) {
      return NextResponse.json(
        { error: 'No pueblos to backup' },
        { status: 400 }
      );
    }

    const backup = await createGenericBackup('pueblos', pueblos, 'manual', name);

    if (rotate) {
      await rotateGenericBackups('pueblos', 10);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating pueblo backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

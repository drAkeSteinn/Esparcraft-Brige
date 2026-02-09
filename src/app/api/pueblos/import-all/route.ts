import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { createHash } from 'crypto';
import { createGenericBackup } from '@/lib/genericBackupManager';

function validateImportData(data: any): { valid: boolean; error?: string } {
  if (!data.version || typeof data.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version' };
  }
  if (!data.items || !Array.isArray(data.items)) {
    return { valid: false, error: 'Missing or invalid items array' };
  }
  if (data.items.length === 0) {
    return { valid: false, error: 'No items to import' };
  }
  for (const item of data.items) {
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: 'Pueblo missing id' };
    }
    if (!item.name || typeof item.name !== 'string') {
      return { valid: false, error: `Pueblo ${item.id} missing name` };
    }
    if (!item.worldId) {
      return { valid: false, error: `Pueblo ${item.id} missing worldId` };
    }
  }
  if (data.checksum) {
    const itemsString = JSON.stringify(data.items, null, 2);
    const calculatedChecksum = createHash('sha256').update(itemsString).digest('hex');
    if (calculatedChecksum !== data.checksum) {
      return { valid: false, error: 'Checksum mismatch - file may be corrupted' };
    }
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, createBackup: shouldCreateBackup = true } = body;

    const validation = validateImportData(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (shouldCreateBackup) {
      const currentPueblos = await puebloDbManager.getAll();
      await createGenericBackup('pueblos', currentPueblos, 'auto-backup-before-import');
    }

    await puebloDbManager.deleteAll();

    const importedPueblos: any[] = [];
    for (const item of data.items) {
      const newPueblo = await puebloDbManager.create(
        {
          worldId: item.worldId,
          name: item.name,
          type: item.type,
          description: item.description,
          lore: item.lore,
          area: item.area
        },
        item.id
      );
      importedPueblos.push(newPueblo);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedPueblos.length} pueblos`,
      data: {
        importedCount: importedPueblos.length,
        backupCreated: shouldCreateBackup,
        importDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing pueblos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import pueblos' },
      { status: 500 }
    );
  }
}

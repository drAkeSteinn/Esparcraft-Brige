import { NextRequest, NextResponse } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';
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
      return { valid: false, error: 'Edificio missing id' };
    }
    if (!item.name || typeof item.name !== 'string') {
      return { valid: false, error: `Edificio ${item.id} missing name` };
    }
    if (!item.worldId || !item.puebloId) {
      return { valid: false, error: `Edificio ${item.id} missing worldId or puebloId` };
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
      const currentEdificios = await edificioDbManager.getAll();
      await createGenericBackup('edificios', currentEdificios, 'auto-backup-before-import');
    }

    await edificioDbManager.deleteAll();

    const importedEdificios: any[] = [];
    for (const item of data.items) {
      const newEdificio = await edificioDbManager.create(
        {
          worldId: item.worldId,
          puebloId: item.puebloId,
          name: item.name,
          lore: item.lore,
          rumores: item.rumores,
          eventos_recientes: item.eventos_recientes,
          area: item.area,
          puntosDeInteres: item.puntosDeInteres
        },
        item.id
      );
      importedEdificios.push(newEdificio);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedEdificios.length} edificios`,
      data: {
        importedCount: importedEdificios.length,
        backupCreated: shouldCreateBackup,
        importDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing edificios:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import edificios' },
      { status: 500 }
    );
  }
}

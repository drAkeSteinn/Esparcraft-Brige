import { NextRequest, NextResponse } from 'next/server';
import { worldDbManager } from '@/lib/worldDbManager';
import { createHash } from 'crypto';
import { createGenericBackup } from '@/lib/genericBackupManager';

// Validar estructura del archivo de importación
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
  // Validar estructura de cada mundo
  for (const item of data.items) {
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: 'World missing id' };
    }
    if (!item.name || typeof item.name !== 'string') {
      return { valid: false, error: `World ${item.id} missing name` };
    }
    if (!item.lore) {
      return { valid: false, error: `World ${item.id} missing lore` };
    }
  }
  // Validar checksum si está presente
  if (data.checksum) {
    const itemsString = JSON.stringify(data.items, null, 2);
    const calculatedChecksum = createHash('sha256').update(itemsString).digest('hex');
    if (calculatedChecksum !== data.checksum) {
      return { valid: false, error: 'Checksum mismatch - file may be corrupted' };
    }
  }
  return { valid: true };
}

// POST - Importa y reemplaza todos los mundos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, createBackup: shouldCreateBackup = true } = body;

    // Validar estructura
    const validation = validateImportData(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Crear backup automático antes de importar
    if (shouldCreateBackup) {
      const currentWorlds = await worldDbManager.getAll();
      await createGenericBackup('worlds', currentWorlds, 'auto-backup-before-import');
    }

    // Borrar todos los mundos existentes
    await worldDbManager.deleteAll();

    // Importar los nuevos mundos
    const importedWorlds: any[] = [];
    for (const world of data.items) {
      const newWorld = await worldDbManager.create(
        {
          name: world.name,
          lore: world.lore,
          area: world.area
        },
        world.id
      );
      importedWorlds.push(newWorld);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedWorlds.length} worlds`,
      data: {
        importedCount: importedWorlds.length,
        backupCreated: shouldCreateBackup,
        importDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing worlds:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import worlds' },
      { status: 500 }
    );
  }
}

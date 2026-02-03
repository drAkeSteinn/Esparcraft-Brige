import { NextRequest, NextResponse } from 'next/server';
import { placeTypeDbManager } from '@/lib/placeTypeDbManager';
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
  // Validar estructura de cada tipo de lugar
  for (const item of data.items) {
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: 'Place type missing id' };
    }
    if (!item.name || typeof item.name !== 'string') {
      return { valid: false, error: `Place type ${item.id} missing name` };
    }
    if (!item.icon || typeof item.icon !== 'string') {
      return { valid: false, error: `Place type ${item.id} missing icon` };
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

// POST - Importa y reemplaza todos los tipos de lugares
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
      const currentPlaceTypes = await placeTypeDbManager.getAll();
      await createGenericBackup('place-types', currentPlaceTypes, 'auto-backup-before-import');
    }

    // Borrar todos los tipos de lugares existentes
    await placeTypeDbManager.deleteAll();

    // Importar los nuevos tipos de lugares
    const importedPlaceTypes: any[] = [];
    for (const placeType of data.items) {
      const newPlaceType = await placeTypeDbManager.create(
        {
          name: placeType.name,
          icon: placeType.icon,
          color: placeType.color
        },
        placeType.id
      );
      importedPlaceTypes.push(newPlaceType);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedPlaceTypes.length} place types`,
      data: {
        importedCount: importedPlaceTypes.length,
        backupCreated: shouldCreateBackup,
        importDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing place types:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import place types' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { npcDbManager } from '@/lib/npcDbManager';
import { createHash } from 'crypto';
import { createBackup } from '@/lib/npcBackupManager';

// Validar estructura del archivo de importación
function validateImportData(data: any): { valid: boolean; error?: string } {
  if (!data.version || typeof data.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version' };
  }
  if (!data.npcs || !Array.isArray(data.npcs)) {
    return { valid: false, error: 'Missing or invalid npcs array' };
  }
  if (data.npcs.length === 0) {
    return { valid: false, error: 'No NPCs to import' };
  }
  // Validar estructura de cada NPC
  for (const npc of data.npcs) {
    if (!npc.id || typeof npc.id !== 'string') {
      return { valid: false, error: 'NPC missing id' };
    }
    if (!npc.location || !npc.location.worldId) {
      return { valid: false, error: `NPC ${npc.id} missing location or worldId` };
    }
    if (!npc.card || !npc.card.name) {
      return { valid: false, error: `NPC ${npc.id} missing card or name` };
    }
  }
  // Validar checksum si está presente
  if (data.checksum) {
    // Usar el mismo formato que la exportación (con indentación)
    const npcsString = JSON.stringify(data.npcs, null, 2);
    const calculatedChecksum = createHash('sha256').update(npcsString).digest('hex');
    if (calculatedChecksum !== data.checksum) {
      return { valid: false, error: 'Checksum mismatch - file may be corrupted' };
    }
  }
  return { valid: true };
}

// POST - Importa y reemplaza todos los NPCs
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
      const currentNPCs = await npcDbManager.getAll();
      await createBackup(currentNPCs, 'auto-backup-before-import');
    }

    // Borrar todos los NPCs existentes
    await npcDbManager.deleteAll();

    // Importar los nuevos NPCs
    const importedNPCs: any[] = [];
    for (const npc of data.npcs) {
      const newNPC = await npcDbManager.create(
        {
          location: npc.location,
          card: npc.card
        },
        npc.id
      );
      importedNPCs.push(newNPC);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedNPCs.length} NPCs`,
      data: {
        importedCount: importedNPCs.length,
        backupCreated: shouldCreateBackup,
        importDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing NPCs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import NPCs' },
      { status: 500 }
    );
  }
}

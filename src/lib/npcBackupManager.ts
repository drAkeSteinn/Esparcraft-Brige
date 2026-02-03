import { NPC } from './types';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Ruta del directorio de backups
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'npcs-backups');

// Asegurar que el directorio de backups existe
async function ensureBackupsDir() {
  try {
    await fs.access(BACKUPS_DIR);
  } catch {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
  }
}

// Interfaz para metadatos de backup
export interface NPCBackupMetadata {
  id: string;
  filename: string;
  exportDate: string;
  npcCount: number;
  fileSize: number;
  checksum: string;
  source: 'manual' | 'auto';
}

// Crear un nuevo backup
export async function createBackup(
  npcs: NPC[],
  source: 'manual' | 'auto' = 'manual',
  customName?: string
): Promise<NPCBackupMetadata> {
  await ensureBackupsDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = `backup-${timestamp}`;
  const filename = customName ? `${customName}.json` : `npcs-${source}-${timestamp}.json`;

  // Calcular checksum
  const npcsString = JSON.stringify(npcs, null, 2);
  const checksum = createHash('sha256').update(npcsString).digest('hex');

  // Crear datos del backup
  const backupData = {
    version: '1.0',
    backupId: id,
    backupDate: new Date().toISOString(),
    source,
    npcCount: npcs.length,
    checksum,
    npcs
  };

  const filePath = path.join(BACKUPS_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

  const stats = await fs.stat(filePath);

  return {
    id,
    filename,
    exportDate: new Date().toISOString(),
    npcCount: npcs.length,
    fileSize: stats.size,
    checksum,
    source
  };
}

// Listar todos los backups
export async function listBackups(): Promise<NPCBackupMetadata[]> {
  await ensureBackupsDir();

  try {
    const files = await fs.readdir(BACKUPS_DIR);
    const backups: NPCBackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        backups.push({
          id: data.backupId || file,
          filename: file,
          exportDate: data.backupDate || stats.mtime.toISOString(),
          npcCount: data.npcCount || 0,
          fileSize: stats.size,
          checksum: data.checksum || '',
          source: data.source || 'manual'
        });
      }
    }

    // Ordenar por fecha descendente (más reciente primero)
    return backups.sort((a, b) =>
      new Date(b.exportDate).getTime() - new Date(a.exportDate).getTime()
    );
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

// Obtener un backup específico por filename
export async function getBackup(filename: string): Promise<NPC[] | null> {
  const filePath = path.join(BACKUPS_DIR, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Validar checksum
    if (data.checksum) {
      // Usar el mismo formato que createBackup (con indentación)
      const npcsString = JSON.stringify(data.npcs, null, 2);
      const calculatedChecksum = createHash('sha256').update(npcsString).digest('hex');

      if (calculatedChecksum !== data.checksum) {
        console.error('Backup checksum mismatch:', filename);
        return null;
      }
    }

    return data.npcs;
  } catch (error) {
    console.error('Error reading backup:', error);
    return null;
  }
}

// Restaurar un backup
export async function restoreBackup(filename: string): Promise<{ success: boolean; npcCount?: number; error?: string }> {
  try {
    const npcs = await getBackup(filename);

    if (!npcs) {
      return {
        success: false,
        error: 'Failed to read backup or checksum mismatch'
      };
    }

    // Crear backup automático del estado actual antes de restaurar
    const { npcDbManager } = await import('./npcDbManager');
    const currentNPCs = await npcDbManager.getAll();
    if (currentNPCs.length > 0) {
      await createBackup(currentNPCs, 'auto', `pre-restore-${Date.now()}`);
    }

    // Borrar todos los NPCs actuales
    await npcDbManager.deleteAll();

    // Importar NPCs del backup
    for (const npc of npcs) {
      await npcDbManager.create(
        {
          location: npc.location,
          card: npc.card
        },
        npc.id
      );
    }

    return {
      success: true,
      npcCount: npcs.length
    };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore backup'
    };
  }
}

// Eliminar un backup
export async function deleteBackup(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(BACKUPS_DIR, filename);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting backup:', error);
    return false;
  }
}

// Rotar backups: mantener solo los últimos N backups
export async function rotateBackups(maxBackups: number = 10): Promise<void> {
  try {
    const backups = await listBackups();

    if (backups.length <= maxBackups) {
      return; // No hay necesidad de rotar
    }

    // Eliminar los backups más antiguos
    const toDelete = backups.slice(maxBackups);
    for (const backup of toDelete) {
      await deleteBackup(backup.filename);
    }
  } catch (error) {
    console.error('Error rotating backups:', error);
  }
}

// Obtener el tamaño total del directorio de backups
export async function getBackupsTotalSize(): Promise<number> {
  try {
    const backups = await listBackups();
    return backups.reduce((total, backup) => total + backup.fileSize, 0);
  } catch (error) {
    console.error('Error calculating backups total size:', error);
    return 0;
  }
}

// Descargar un backup (leerlo y retornar el contenido)
export async function downloadBackup(filename: string): Promise<string | null> {
  const filePath = path.join(BACKUPS_DIR, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error downloading backup:', error);
    return null;
  }
}

export default {
  createBackup,
  listBackups,
  getBackup,
  restoreBackup,
  deleteBackup,
  rotateBackups,
  getBackupsTotalSize,
  downloadBackup
};

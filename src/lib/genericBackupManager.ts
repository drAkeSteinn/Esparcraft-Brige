import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Tipos de entidades soportados
export type EntityType = 'worlds' | 'pueblos' | 'edificios' | 'place-types';

// Interfaz para metadatos de backup
export interface GenericBackupMetadata {
  id: string;
  entityType: EntityType;
  filename: string;
  exportDate: string;
  itemCount: number;
  fileSize: number;
  checksum: string;
  source: 'manual' | 'auto';
}

// Datos de exportación genérica
export interface GenericExportData<T> {
  version: string;
  exportDate: string;
  entityType: EntityType;
  itemCount: number;
  checksum: string;
  items: T[];
}

// Obtener el directorio de backups para un tipo de entidad
function getBackupsDir(entityType: EntityType): string {
  return path.join(process.cwd(), 'data', `${entityType}-backups`);
}

// Asegurar que el directorio de backups existe
async function ensureBackupsDir(entityType: EntityType) {
  const backupsDir = getBackupsDir(entityType);
  try {
    await fs.access(backupsDir);
  } catch {
    await fs.mkdir(backupsDir, { recursive: true });
  }
}

// Crear un nuevo backup genérico
export async function createGenericBackup<T>(
  entityType: EntityType,
  items: T[],
  source: 'manual' | 'auto' = 'manual',
  customName?: string
): Promise<GenericBackupMetadata> {
  await ensureBackupsDir(entityType);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = `backup-${timestamp}`;
  const filename = customName
    ? `${customName}.json`
    : `${entityType}-${source}-${timestamp}.json`;

  // Calcular checksum
  const itemsString = JSON.stringify(items, null, 2);
  const checksum = createHash('sha256').update(itemsString).digest('hex');

  // Crear datos del backup
  const backupData = {
    version: '1.0',
    backupId: id,
    backupDate: new Date().toISOString(),
    entityType,
    source,
    itemCount: items.length,
    checksum,
    items
  };

  const backupsDir = getBackupsDir(entityType);
  const filePath = path.join(backupsDir, filename);
  await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

  const stats = await fs.stat(filePath);

  return {
    id,
    entityType,
    filename,
    exportDate: new Date().toISOString(),
    itemCount: items.length,
    fileSize: stats.size,
    checksum,
    source
  };
}

// Listar todos los backups de un tipo de entidad
export async function listGenericBackups(
  entityType: EntityType
): Promise<GenericBackupMetadata[]> {
  await ensureBackupsDir(entityType);

  try {
    const backupsDir = getBackupsDir(entityType);
    const files = await fs.readdir(backupsDir);
    const backups: GenericBackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        backups.push({
          id: data.backupId || file,
          entityType: data.entityType || entityType,
          filename: file,
          exportDate: data.backupDate || stats.mtime.toISOString(),
          itemCount: data.itemCount || 0,
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
    console.error(`Error listing ${entityType} backups:`, error);
    return [];
  }
}

// Obtener un backup específico por filename
export async function getGenericBackup<T>(
  entityType: EntityType,
  filename: string
): Promise<T[] | null> {
  const backupsDir = getBackupsDir(entityType);
  const filePath = path.join(backupsDir, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Validar checksum
    if (data.checksum) {
      const itemsString = JSON.stringify(data.items, null, 2);
      const calculatedChecksum = createHash('sha256').update(itemsString).digest('hex');

      if (calculatedChecksum !== data.checksum) {
        console.error(`Backup checksum mismatch: ${filename}`);
        return null;
      }
    }

    return data.items;
  } catch (error) {
    console.error('Error reading backup:', error);
    return null;
  }
}

// Eliminar un backup
export async function deleteGenericBackup(
  entityType: EntityType,
  filename: string
): Promise<boolean> {
  try {
    const backupsDir = getBackupsDir(entityType);
    const filePath = path.join(backupsDir, filename);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting backup:', error);
    return false;
  }
}

// Rotar backups: mantener solo los últimos N backups
export async function rotateGenericBackups(
  entityType: EntityType,
  maxBackups: number = 10
): Promise<void> {
  try {
    const backups = await listGenericBackups(entityType);

    if (backups.length <= maxBackups) {
      return; // No hay necesidad de rotar
    }

    // Eliminar los backups más antiguos
    const toDelete = backups.slice(maxBackups);
    for (const backup of toDelete) {
      await deleteGenericBackup(entityType, backup.filename);
    }
  } catch (error) {
    console.error(`Error rotating ${entityType} backups:`, error);
  }
}

// Obtener el tamaño total del directorio de backups
export async function getBackupsTotalSize(entityType: EntityType): Promise<number> {
  try {
    const backups = await listGenericBackups(entityType);
    return backups.reduce((total, backup) => total + backup.fileSize, 0);
  } catch (error) {
    console.error(`Error calculating ${entityType} backups total size:`, error);
    return 0;
  }
}

// Descargar un backup (leerlo y retornar el contenido)
export async function downloadGenericBackup(
  entityType: EntityType,
  filename: string
): Promise<string | null> {
  const backupsDir = getBackupsDir(entityType);
  const filePath = path.join(backupsDir, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error downloading backup:', error);
    return null;
  }
}

export default {
  createGenericBackup,
  listGenericBackups,
  getGenericBackup,
  deleteGenericBackup,
  rotateGenericBackups,
  getBackupsTotalSize,
  downloadGenericBackup
};

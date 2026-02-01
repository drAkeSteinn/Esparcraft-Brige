#!/usr/bin/env bun
/**
 * Script para listar todos los backups disponibles
 * Muestra información detallada de cada backup: fecha, tamaño, timestamp
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';

interface BackupInfo {
  filename: string;
  fullPath: string;
  timestamp: string;
  isoDate: string;
  size: number;
  sizeKB: number;
  isManual: boolean;
  displayName: string;
}

const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

console.log('📦 Listando backups disponibles...\n');

// Verificar que el directorio de backups existe
if (!existsSync(backupDir)) {
  console.error('❌ Error: El directorio de backups no existe');
  console.error(`📍 Ruta: ${backupDir}`);
  console.error('\n💡 Ejecuta: bun run db:backup para crear el primer backup');
  process.exit(1);
}

// Leer archivos de backups
const files = readdirSync(backupDir)
  .filter(file => file.startsWith('custom.db.'))
  .sort((a, b) => b.localeCompare(a)); // Ordenar descendente por nombre

if (files.length === 0) {
  console.log('⚠️  No hay backups disponibles');
  console.log('\n💡 Para crear un backup, ejecuta: bun run db:backup');
  process.exit(0);
}

// Obtener información de cada backup
const backups: BackupInfo[] = files.map(filename => {
  const fullPath = join(backupDir, filename);

  try {
    const stats = statSync(fullPath);
    const size = stats.size;

    // Extraer timestamp del nombre del archivo
    // Formato esperado: custom.db.timestamp o custom.db.timestamp-manual
    let timestamp = '';
    let isManual = false;

    if (filename.includes('-manual-')) {
      isManual = true;
      const parts = filename.replace('custom.db.', '').split('-manual-');
      timestamp = parts[0];
    } else {
      timestamp = filename.replace('custom.db.', '');
    }

    // Intentar convertir timestamp a fecha legible
    let isoDate = '';
    try {
      // Formatos de timestamp comunes:
      // 20260131_143721 (YYYYMMDD_HHMMSS)
      // 2026-01-31T14-43-42 (ISO)
      const cleanTimestamp = timestamp.replace(/[T-]/g, '').replace(/_/g, '');

      if (cleanTimestamp.length >= 14) {
        const year = cleanTimestamp.substring(0, 4);
        const month = cleanTimestamp.substring(4, 6);
        const day = cleanTimestamp.substring(6, 8);
        const hour = cleanTimestamp.substring(8, 10);
        const minute = cleanTimestamp.substring(10, 12);
        const second = cleanTimestamp.substring(12, 14);

        isoDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
    } catch (error) {
      isoDate = timestamp;
    }

    // Generar nombre descriptivo
    const displaySuffix = isManual ? ' (Manual)' : '';
    const displayName = `${isoDate}${displaySuffix}`;

    return {
      filename,
      fullPath,
      timestamp,
      isoDate,
      size,
      sizeKB: Math.round(size / 1024),
      isManual,
      displayName
    };
  } catch (error) {
    return {
      filename,
      fullPath,
      timestamp: '',
      isoDate: 'Error leyendo',
      size: 0,
      sizeKB: 0,
      isManual: false,
      displayName: filename
    };
  }
});

// Mostrar resultados
console.log(`📁 Directorio: ${backupDir}\n`);
console.log(`📦 Total de backups: ${backups.length}\n`);

backups.forEach((backup, index) => {
  const prefix = index === 0 ? '🆕' : '  ';
  const manualIcon = backup.isManual ? '👤' : '🔄';
  const sizeStr = backup.sizeKB < 1000 ? `${backup.sizeKB} KB` : `${(backup.sizeKB / 1024).toFixed(2)} MB`;

  console.log(`${prefix} [${index + 1}] ${manualIcon} ${backup.filename}`);
  console.log(`      📅 Fecha: ${backup.displayName}`);
  console.log(`      📊 Tamaño: ${sizeStr}`);
  console.log(`      📍 Ruta: ${backup.fullPath}`);
  console.log('');
});

// Mostrar resumen
const manualBackups = backups.filter(b => b.isManual).length;
const autoBackups = backups.length - manualBackups;
const totalSize = backups.reduce((sum, b) => sum + b.sizeKB, 0);
const avgSize = (totalSize / backups.length).toFixed(2);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Resumen:');
console.log('');
console.log(`   📦 Total de backups: ${backups.length}`);
console.log(`   👤 Manuales: ${manualBackups}`);
console.log(`   🔄 Automáticos: ${autoBackups}`);
console.log(`   📊 Tamaño total: ${(totalSize / 1024).toFixed(2)} MB`);
console.log(`   📊 Tamaño promedio: ${avgSize} KB`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Exportar como JSON para uso en scripts o APIs
console.log('💾 Backups en formato JSON:');
console.log(JSON.stringify(backups.map(b => ({
  filename: b.filename,
  timestamp: b.timestamp,
  isoDate: b.isoDate,
  sizeKB: b.sizeKB,
  isManual: b.isManual
})), null, 2));

console.log('\n💡 Comandos útiles:');
console.log('   • Crear un backup manual: bun run db:backup manual');
console.log('   • Listar backups: bun run db:list-backups');
console.log('   • Restaurar backup [N]: bun run db:restore <nombre-archivo>');
console.log('');
console.log('   Ejemplo de restauración:');
console.log(`   bun run db:restore ${backups[0].filename}`);

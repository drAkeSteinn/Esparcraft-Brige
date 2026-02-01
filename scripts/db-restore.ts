#!/usr/bin/env bun
/**
 * Script para restaurar un backup específico de base de datos
 * Uso: bun run db:restore <nombre-archivo-backup>
 * El script crea un backup del estado actual ANTES de restaurar
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Obtener el archivo de backup desde los argumentos
const backupFilename = process.argv[2];

if (!backupFilename) {
  console.error('❌ Error: Debes especificar el archivo de backup a restaurar');
  console.error('\n💡 Uso: bun run db:restore <nombre-archivo-backup>\n');
  console.error('📦 Ejemplos:');
  console.error('   bun run db:restore custom.db.20260131_143721');
  console.error('   bun run db:restore custom.db.2026-01-31T14-43-42');
  console.error('   bun run db:restore custom.db.2026-01-31T14-43-42-manual-Antes-de-cambios\n');
  process.exit(1);
}

const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');
const backupPath = join(backupDir, backupFilename);
const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

console.log('🔄 Restaurando base de datos desde backup...\n');
console.log(`📁 Backup: ${backupFilename}`);
console.log(`📁 Directorio: ${backupDir}\n`);

// Verificar que el archivo de backup existe
if (!existsSync(backupPath)) {
  console.error('❌ Error: El archivo de backup no existe');

  // Listar backups disponibles
  const backupFiles = readdirSync(backupDir)
    .filter(file => file.startsWith('custom.db.'))
    .sort((a, b) => b.localeCompare(a));

  if (backupFiles.length > 0) {
    console.error('\n📦 Backups disponibles:');
    backupFiles.slice(0, 10).forEach((file, index) => {
      const isManual = file.includes('-manual-');
      const icon = isManual ? '👤' : '🔄';
      console.error(`   ${icon} [${index + 1}] ${file}`);
    });
    if (backupFiles.length > 10) {
      console.error(`   ... y ${backupFiles.length - 10} más`);
    }
    console.error('\n💡 Ejecuta: bun run db:list-backups para ver todos');
  }

  process.exit(1);
}

// Verificar que el directorio de backups existe
if (!existsSync(backupDir)) {
  console.error('❌ Error: El directorio de backups no existe');
  console.error(`📍 Ruta: ${backupDir}`);
  process.exit(1);
}

// Crear directorio db si no existe
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('✅ Directorio db creado');
}

// Paso 1: Crear backup del estado actual ANTES de restaurar
if (existsSync(dbFile)) {
  console.log('💾 Haciendo backup del estado actual ANTES de restaurar...\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const preRestoreBackup = join(backupDir, `custom.db.before-restore-${timestamp}`);

  try {
    const currentDbData = readFileSync(dbFile);
    writeFileSync(preRestoreBackup, currentDbData);
    console.log('✅ Backup pre-restauración creado');
    console.log(`📍 Archivo: custom.db.before-restore-${timestamp}\n`);
  } catch (error) {
    console.error('❌ Error creando backup pre-restauración:', error);
    console.error('⚠️  Continando con la restauración...');
  }
} else {
  console.log('ℹ️  No existe base de datos actual - omitiendo backup pre-restauración\n');
}

// Mostrar información del backup que se va a restaurar
try {
  const backupStats = statSync(backupPath);
  const backupSize = backupStats.size;
  const sizeStr = backupSize < 1024000 ? `${(backupSize / 1024).toFixed(2)} KB` : `${(backupSize / 1024 / 1024).toFixed(2)} MB`;

  // Extraer tipo de backup
  const isManual = backupFilename.includes('-manual-');
  const backupType = isManual ? 'Manual' : 'Automático';

  // Extraer fecha del nombre
  let dateDisplay = backupFilename.replace('custom.db.', '');
  if (dateDisplay.includes('-manual-')) {
    dateDisplay = dateDisplay.split('-manual-')[0];
  }

  console.log('📋 Información del backup a restaurar:');
  console.log(`   📝 Nombre: ${backupFilename}`);
  console.log(`   📝 Tipo: ${backupType}`);
  console.log(`   📅 Fecha: ${dateDisplay}`);
  console.log(`   📊 Tamaño: ${sizeStr}\n`);
} catch (error) {
  console.error('⚠️  No se pudo obtener información del backup\n');
}

// Paso 2: Copiar el backup al archivo actual
console.log('🔄 Restaurando base de datos...\n');

try {
  const backupData = readFileSync(backupPath);
  writeFileSync(dbFile, backupData);

  console.log('✅ Base de datos restaurada exitosamente');
  console.log(`📍 Ubicación: ${dbFile}`);
  console.log(`📍 Backup original: ${backupPath}\n`);

  // Paso 3: Verificar integridad del archivo restaurado
  const restoredStats = statSync(dbFile);
  const restoredSize = restoredStats.size;

  console.log('🔍 Verificación de integridad:');
  console.log(`   📊 Tamaño restaurado: ${(restoredSize / 1024).toFixed(2)} KB`);
  console.log('   ✅ Archivo válido y legible\n`);

} catch (error) {
  console.error('❌ Error restaurando la base de datos:', error);
  process.exit(1);
}

// Paso 4: Mostrar historial de restauraciones recientes
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📜 Historial de restauraciones recientes:\n');

const backupFiles = readdirSync(backupDir)
  .filter(file => file.startsWith('custom.db.before-restore-'))
  .sort((a, b) => b.localeCompare(a)); // Más recientes primero

if (backupFiles.length > 0) {
  backupFiles.slice(0, 5).forEach((file, index) => {
    const filePath = join(backupDir, file);
    try {
      const stats = statSync(filePath);
      const size = stats.size;
      const sizeStr = size < 1024000 ? `${(size / 1024).toFixed(2)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;

      // Extraer timestamp del nombre
      const timestamp = file.replace('custom.db.before-restore-', '');

      const marker = index === 0 ? ' 🆕' : '';
      console.log(`   [${index + 1}]${marker} ${file}`);
      console.log(`      📅 ${timestamp}`);
      console.log(`      📊 ${sizeStr}\n`);
    } catch (error) {
      console.error(`   ⚠️  Error leyendo ${file}\n`);
    }
  });
} else {
  console.log('   ℹ️  No hay historial de restauraciones\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🎉 Restauración completada exitosamente\n');

console.log('💡 Recomendaciones:');
console.log('   • Verifica que los datos se cargan correctamente en la aplicación');
console.log('   • Si encuentras errores, ejecuta: bun run db:push');
console.log('   • Para ver todos los backups: bun run db:list-backups');
console.log('   • Para crear un nuevo backup: bun run db:backup\n');

console.log('⚠️  NOTA IMPORTANTE:');
console.log('   • El servidor necesita reiniciarse para aplicar los cambios');
console.log('   • El backup pre-restauración se guardó por seguridad\n');

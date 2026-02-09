#!/usr/bin/env bun
/**
 * Script para crear backups con nombres personalizados
 * Permite crear backups manuales con nombres descriptivos
 * Uso: bun run db:backup [nombre-opcional]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

// Directorio de backups
const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

// Obtener nombre personalizado de los argumentos
const customName = process.argv[2];

// Determinar si es backup manual
const isManual = customName && customName.trim() !== '';
const backupType = isManual ? 'manual' : 'auto';

console.log('💾 Creando backup de base de datos...\n');

// Verificar que la base de datos existe
if (!existsSync(dbFile)) {
  console.error('❌ Error: La base de datos no existe');
  console.error(`📍 Ruta: ${dbFile}`);
  process.exit(1);
}

// Crear directorio de backup si no existe
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
  console.log('✅ Directorio de backups creado');
}

// Generar nombre de archivo con timestamp
const now = new Date();
const timestamp = now.toISOString()
  .replace(/[:.]/g, '-')
  .slice(0, -5); // YYYY-MM-DDTHH-MM-SS

let backupFileName: string;

if (isManual) {
  // Formato: custom.db.timestamp-manual-NOMBRE
  const safeName = customName.trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Solo caracteres seguros
    .substring(0, 50); // Máximo 50 caracteres
  backupFileName = `custom.db.${timestamp}-manual-${safeName}`;
  console.log(`👤 Backup manual: ${safeName}`);
} else {
  // Formato: custom.db.timestamp
  backupFileName = `custom.db.${timestamp}`;
  console.log('🔄 Backup automático');
}

const backupPath = join(backupDir, backupFileName);

console.log(`📁 Directorio: ${backupDir}`);
console.log(`📝 Archivo: ${backupFileName}\n`);

// Leer base de datos
try {
  const dbData = readFileSync(dbFile);

  // Escribir backup
  writeFileSync(backupPath, dbData);

  console.log('✅ Backup creado exitosamente');
  console.log(`📍 Ubicación: ${backupPath}`);
  console.log(`📊 Tamaño: ${(dbData.length / 1024).toFixed(2)} KB`);

  // Mostrar estadísticas de backups existentes
  const backupFiles = readdirSync(backupDir)
    .filter(file => file.startsWith('custom.db.'))
    .sort((a, b) => b.localeCompare(a)); // Ordenar descendente

  console.log(`\n📦 Total de backups: ${backupFiles.length}`);

  if (backupFiles.length > 0) {
    console.log('\n📜 Últimos 5 backups:');
    backupFiles.slice(0, 5).forEach((file, index) => {
      const filePath = join(backupDir, file);
      const stats = readFileSync(filePath);
      const size = stats.length;
      const sizeStr = size < 1024000 ? `${(size / 1024).toFixed(2)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;

      // Extraer tipo de backup
      const isManual = file.includes('-manual-');
      const typeIcon = isManual ? '👤' : '🔄';

      // Extraer timestamp del nombre
      const timestamp = file.replace('custom.db.', '').split('-manual-')[0];
      let dateDisplay = timestamp;
      try {
        const cleanTimestamp = timestamp.replace(/[T-]/g, '');
        if (cleanTimestamp.length >= 14) {
          const year = cleanTimestamp.substring(0, 4);
          const month = cleanTimestamp.substring(4, 6);
          const day = cleanTimestamp.substring(6, 8);
          const hour = cleanTimestamp.substring(8, 10);
          const minute = cleanTimestamp.substring(10, 12);
          dateDisplay = `${year}-${month}-${day} ${hour}:${minute}`;
        }
      } catch (e) {
        dateDisplay = timestamp;
      }

      const marker = index === 0 ? ' 🆕' : '';
      console.log(`   ${typeIcon} ${file}${marker}`);
      console.log(`      📅 ${dateDisplay}`);
      console.log(`      📊 ${sizeStr}\n`);
    });
  }

  // Opcional: Mantener solo los últimos 20 backups
  if (backupFiles.length > 20) {
    console.log('\n🧹 Manteniendo solo los últimos 20 backups...');

    const filesToDelete = backupFiles.slice(20);
    filesToDelete.forEach(file => {
      const filePath = join(backupDir, file);
      try {
        const fs = require('fs');
        fs.unlinkSync(filePath);
        console.log(`   🗑️  Eliminado: ${file}`);
      } catch (error) {
        console.error(`   ⚠️  No se pudo eliminar ${file}:`, error);
      }
    });

    console.log(`✅ Se eliminaron ${filesToDelete.length} backups antiguos`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Backup completado exitosamente');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (isManual) {
    console.log('💡 Para restaurar este backup:');
    console.log(`   bun run db:restore ${backupFileName}\n`);
  } else {
    console.log('💡 Para ver todos los backups disponibles:');
    console.log('   bun run db:list-backups\n');
    console.log('💡 Para crear un backup con nombre personalizado:');
    console.log('   bun run db:backup "descripción del backup"\n');
  }
} catch (error) {
  console.error('\n❌ Error creando el backup:', error);
  process.exit(1);
}

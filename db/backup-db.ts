#!/usr/bin/env bun
/**
 * Script para crear backups de la base de datos
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

// Directorio de backups
const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

console.log('💾 Creando backup de base de datos...\n');

// Verificar que la base de datos existe
if (!existsSync(dbFile)) {
  console.error('❌ Error: La base de datos no existe');
  console.error(`📍 Buscando en: ${dbFile}`);
  process.exit(1);
}

// Crear directorio de backup si no existe
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
  console.log('✅ Directorio de backups creado');
}

// Generar nombre de archivo con timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFileName = `custom.db.${timestamp}`;
const backupPath = join(backupDir, backupFileName);

console.log(`📍 Archivo de backup: ${backupPath}`);

// Leer base de datos
try {
  const dbData = readFileSync(dbFile);

  // Escribir backup
  writeFileSync(backupPath, dbData);

  console.log(`✅ Backup creado exitosamente`);
  console.log(`📁 Ubicación: ${backupPath}`);
  console.log(`📊 Tamaño: ${(dbData.length / 1024).toFixed(2)} KB`);

  // Mostrar estadísticas de backups existentes
  const backupFiles = readdirSync(backupDir)
    .filter(file => file.startsWith('custom.db.'))
    .sort();

  console.log(`\n📦 Total de backups: ${backupFiles.length}`);

  if (backupFiles.length > 0) {
    console.log('\n📜 Backups existentes:');
    backupFiles.slice(-5).forEach(file => {
      const filePath = join(backupDir, file);
      const stats = readFileSync(filePath);
      const size = (stats.length / 1024).toFixed(2);
      console.log(`   • ${file} (${size} KB)`);
    });

    if (backupFiles.length > 5) {
      console.log(`   ... y ${backupFiles.length - 5} más`);
    }
  }

  // Opcional: Mantener solo los últimos 10 backups
  if (backupFiles.length > 10) {
    console.log('\n🧹 Manteniendo solo los últimos 10 backups...');

    const filesToDelete = backupFiles.slice(0, backupFiles.length - 10);
    filesToDelete.forEach(file => {
      const filePath = join(backupDir, file);
      const fs = require('fs');
      try {
        fs.unlinkSync(filePath);
        console.log(`   🗑️  Eliminado: ${file}`);
      } catch (error) {
        console.error(`   ⚠️  No se pudo eliminar ${file}:`, error);
      }
    });
  }

  console.log('\n🎉 Backup completado exitosamente');
} catch (error) {
  console.error('\n❌ Error creando el backup:', error);
  process.exit(1);
}

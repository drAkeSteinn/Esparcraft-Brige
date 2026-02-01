#!/usr/bin/env bun
/**
 * Script para importar datos desde un backup de base de datos
 * Lee un archivo .db de backup e importa los datos a la base de datos actual
 */

import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Obtener el archivo de backup desde los argumentos
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Error: Debes especificar el archivo de backup');
  console.error('\nUso: bun run scripts/import-db-backup.ts <ruta-al-backup.db>\n');
  console.error('Ejemplo: bun run scripts/import-db-backup.ts data-esparcraft/db-backup/custom.db.20250131_123000');
  process.exit(1);
}

// Verificar que el archivo existe
if (!existsSync(backupFile)) {
  console.error(`❌ Error: El archivo de backup no existe: ${backupFile}`);
  process.exit(1);
}

console.log('📦 Importando base de datos desde backup...\n');
console.log(`📍 Backup: ${backupFile}`);

// Directorios
const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

// Verificar el directorio de backup
const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

// Crear directorio db si no existe
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Crear directorio de backup si no existe
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

console.log(`📁 Directorio DB: ${dbDir}`);
console.log(`📁 Directorio Backup: ${backupDir}\n`);

// Hacer backup de la base de datos actual antes de importar
if (existsSync(dbFile)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupBeforeImport = join(backupDir, `custom.db.before-import.${timestamp}`);

  console.log('💾 Haciendo backup de la base de datos actual...');

  try {
    const dbData = readFileSync(dbFile);
    // Usar el módulo fs para escribir el backup
    import('fs').then(fs => {
      fs.writeFileSync(backupBeforeImport, dbData);
      console.log(`✅ Backup creado: ${backupBeforeImport}`);
    });
  } catch (error) {
    console.error('❌ Error haciendo backup:', error);
    process.exit(1);
  }
}

// Importar el backup
console.log('\n🔄 Importando datos del backup...\n');

try {
  // Copiar el archivo de backup al archivo actual
  const backupData = readFileSync(backupFile);
  import('fs').then(fs => {
    fs.writeFileSync(dbFile, backupData);
    console.log('✅ Base de datos importada exitosamente');
    console.log(`📍 Ubicación: ${dbFile}`);

    // Verificar el schema después de la importación
    console.log('\n🔄 Verificando schema de Prisma...\n');

    try {
      execSync('bun run db:push', {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      console.log('\n✅ Schema verificado');
    } catch (error) {
      console.error('\n⚠️  Advertencia: Schema no coincide totalmente');
      console.error('La importación fue exitosa pero puede que necesites ejecutar:');
      console.error('  bun run db:push --force-reset');
    }

    console.log('\n🎉 Importación completada exitosamente');
    console.log('\n💡 Recomendaciones:');
    console.log('   • Verifica que los datos se cargan correctamente en la aplicación');
    console.log('   • Si encuentras errores, ejecuta: bun run db:push');
  });
} catch (error) {
  console.error('\n❌ Error importando la base de datos:', error);
  process.exit(1);
}

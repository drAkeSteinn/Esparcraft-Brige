#!/usr/bin/env bun
/**
 * Script de migración de Mundos, Pueblos y Edificios desde archivos JSON a base de datos
 *
 * Este script:
 * 1. Lee todos los mundos de los archivos JSON en data-esparcraft/worlds/
 * 2. Migra los mundos a la base de datos SQLite usando Prisma
 * 3. Lee todos los pueblos de los archivos JSON en data-esparcraft/pueblos/
 * 4. Migra los pueblos a la base de datos SQLite usando Prisma
 * 5. Lee todos los edificios de los archivos JSON en data-esparcraft/edificios/
 * 6. Migra los edificios a la base de datos SQLite usando Prisma
 * 7. Crea un respaldo de seguridad de los archivos JSON originales
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { World, Pueblo, Edificio } from '../src/lib/types';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');
const BACKUP_DIR = path.join(process.cwd(), 'db', 'world-pueblo-edificio-backup');

// Helper para crear directorio si no existe
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper para leer JSON
function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return null;
  }
}

// Helper para listar archivos JSON
function listFiles(dirPath: string): string[] {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  } catch (error) {
    console.error(`Error listing files in ${dirPath}:`, error);
    return [];
  }
}

// Función principal de migración
async function migrateWorldPuebloEdificio() {
  console.log('🚀 Iniciando migración de Mundos, Pueblos y Edificios a base de datos...\n');

  try {
    // ============================================================
    // FASE 1: Migración de Mundos
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 1: Migración de Mundos');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📂 Leyendo mundos de archivos JSON...');
    const worldFiles = listFiles(path.join(DATA_DIR, 'worlds'));
    console.log(`   Encontrados ${worldFiles.length} archivos JSON de mundos\n`);

    const worldsFromFile: World[] = [];
    for (const file of worldFiles) {
      const world = readJSON<World>(path.join(DATA_DIR, 'worlds', file));
      if (world) {
        worldsFromFile.push(world);
        console.log(`   ✓ Cargado: ${world.id} (${file})`);
      }
    }

    console.log(`\n   Total de mundos cargados: ${worldsFromFile.length}\n`);

    console.log('🔍 Verificando mundos existentes en la base de datos...');
    const existingWorlds = await prisma.world.findMany({
      select: { id: true }
    });
    const existingWorldIds = new Set(existingWorlds.map(w => w.id));
    console.log(`   Mundos existentes en DB: ${existingWorldIds.size}\n`);

    console.log('💾 Migrando mundos a la base de datos...');
    let migratedWorlds = 0;
    let skippedWorlds = 0;
    let errorWorlds = 0;

    for (const world of worldsFromFile) {
      if (existingWorldIds.has(world.id)) {
        console.log(`   ⊘ Omitido (ya existe): ${world.id}`);
        skippedWorlds++;
        continue;
      }

      try {
        await prisma.world.create({
          data: {
            id: world.id,
            name: world.name,
            lore: JSON.stringify(world.lore),
            area: world.area ? JSON.stringify(world.area) : null,
          }
        });
        console.log(`   ✓ Migrado: ${world.id}`);
        migratedWorlds++;
      } catch (error) {
        console.error(`   ✗ Error migrando ${world.id}:`, error);
        errorWorlds++;
      }
    }

    console.log(`\n   Mundos migrados: ${migratedWorlds}`);
    console.log(`   Mundos omitidos (ya existían): ${skippedWorlds}`);
    console.log(`   Errores: ${errorWorlds}\n`);

    // ============================================================
    // FASE 2: Migración de Pueblos
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 2: Migración de Pueblos');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📂 Leyendo pueblos de archivos JSON...');
    const puebloFiles = listFiles(path.join(DATA_DIR, 'pueblos'));
    console.log(`   Encontrados ${puebloFiles.length} archivos JSON de pueblos\n`);

    const pueblosFromFile: Pueblo[] = [];
    for (const file of puebloFiles) {
      const pueblo = readJSON<Pueblo>(path.join(DATA_DIR, 'pueblos', file));
      if (pueblo) {
        pueblosFromFile.push(pueblo);
        console.log(`   ✓ Cargado: ${pueblo.id} (${file})`);
      }
    }

    console.log(`\n   Total de pueblos cargados: ${pueblosFromFile.length}\n`);

    console.log('🔍 Verificando pueblos existentes en la base de datos...');
    const existingPueblos = await prisma.pueblo.findMany({
      select: { id: true }
    });
    const existingPuebloIds = new Set(existingPueblos.map(p => p.id));
    console.log(`   Pueblos existentes en DB: ${existingPuebloIds.size}\n`);

    console.log('💾 Migrando pueblos a la base de datos...');
    let migratedPueblos = 0;
    let skippedPueblos = 0;
    let errorPueblos = 0;

    for (const pueblo of pueblosFromFile) {
      if (existingPuebloIds.has(pueblo.id)) {
        console.log(`   ⊘ Omitido (ya existe): ${pueblo.id}`);
        skippedPueblos++;
        continue;
      }

      try {
        await prisma.pueblo.create({
          data: {
            id: pueblo.id,
            worldId: pueblo.worldId,
            name: pueblo.name,
            type: pueblo.type,
            description: pueblo.description,
            lore: JSON.stringify(pueblo.lore),
            area: pueblo.area ? JSON.stringify(pueblo.area) : null,
          }
        });
        console.log(`   ✓ Migrado: ${pueblo.id}`);
        migratedPueblos++;
      } catch (error) {
        console.error(`   ✗ Error migrando ${pueblo.id}:`, error);
        errorPueblos++;
      }
    }

    console.log(`\n   Pueblos migrados: ${migratedPueblos}`);
    console.log(`   Pueblos omitidos (ya existían): ${skippedPueblos}`);
    console.log(`   Errores: ${errorPueblos}\n`);

    // ============================================================
    // FASE 3: Migración de Edificios
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 3: Migración de Edificios');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📂 Leyendo edificios de archivos JSON...');
    const edificioFiles = listFiles(path.join(DATA_DIR, 'edificios'));
    console.log(`   Encontrados ${edificioFiles.length} archivos JSON de edificios\n`);

    const edificiosFromFile: Edificio[] = [];
    for (const file of edificioFiles) {
      const edificio = readJSON<Edificio>(path.join(DATA_DIR, 'edificios', file));
      if (edificio) {
        edificiosFromFile.push(edificio);
        console.log(`   ✓ Cargado: ${edificio.id} (${file})`);
      }
    }

    console.log(`\n   Total de edificios cargados: ${edificiosFromFile.length}\n`);

    console.log('🔍 Verificando edificios existentes en la base de datos...');
    const existingEdificios = await prisma.edificio.findMany({
      select: { id: true }
    });
    const existingEdificioIds = new Set(existingEdificios.map(e => e.id));
    console.log(`   Edificios existentes en DB: ${existingEdificioIds.size}\n`);

    console.log('💾 Migrando edificios a la base de datos...');
    let migratedEdificios = 0;
    let skippedEdificios = 0;
    let errorEdificios = 0;

    for (const edificio of edificiosFromFile) {
      if (existingEdificioIds.has(edificio.id)) {
        console.log(`   ⊘ Omitido (ya existe): ${edificio.id}`);
        skippedEdificios++;
        continue;
      }

      try {
        await prisma.edificio.create({
          data: {
            id: edificio.id,
            worldId: edificio.worldId,
            puebloId: edificio.puebloId,
            name: edificio.name,
            lore: edificio.lore,
            rumores: edificio.rumores ? JSON.stringify(edificio.rumores) : null,
            eventos_recientes: edificio.eventos_recientes ? JSON.stringify(edificio.eventos_recientes) : null,
            area: JSON.stringify(edificio.area),
            puntosDeInteres: edificio.puntosDeInteres ? JSON.stringify(edificio.puntosDeInteres) : null,
          }
        });
        console.log(`   ✓ Migrado: ${edificio.id}`);
        migratedEdificios++;
      } catch (error) {
        console.error(`   ✗ Error migrando ${edificio.id}:`, error);
        errorEdificios++;
      }
    }

    console.log(`\n   Edificios migrados: ${migratedEdificios}`);
    console.log(`   Edificios omitidos (ya existían): ${skippedEdificios}`);
    console.log(`   Errores: ${errorEdificios}\n`);

    // ============================================================
    // FASE 4: Crear backup de los archivos JSON
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 4: Creando backup de archivos JSON');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('💾 Creando backup de archivos JSON...');
    ensureDir(BACKUP_DIR);
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${backupTimestamp}`);

    // Backup mundos
    console.log('\n   Backing up mundos...');
    const worldsBackupPath = path.join(backupPath, 'worlds');
    ensureDir(worldsBackupPath);
    for (const file of worldFiles) {
      const sourcePath = path.join(DATA_DIR, 'worlds', file);
      const targetPath = path.join(worldsBackupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
    }
    console.log(`   ✓ ${worldFiles.length} mundos backed up`);

    // Backup pueblos
    console.log('\n   Backing up pueblos...');
    const pueblosBackupPath = path.join(backupPath, 'pueblos');
    ensureDir(pueblosBackupPath);
    for (const file of puebloFiles) {
      const sourcePath = path.join(DATA_DIR, 'pueblos', file);
      const targetPath = path.join(pueblosBackupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
    }
    console.log(`   ✓ ${puebloFiles.length} pueblos backed up`);

    // Backup edificios
    console.log('\n   Backing up edificios...');
    const edificiosBackupPath = path.join(backupPath, 'edificios');
    ensureDir(edificiosBackupPath);
    for (const file of edificioFiles) {
      const sourcePath = path.join(DATA_DIR, 'edificios', file);
      const targetPath = path.join(edificiosBackupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
    }
    console.log(`   ✓ ${edificioFiles.length} edificios backed up`);

    console.log(`\n   Backup creado en: ${backupPath}\n`);

    // ============================================================
    // FASE 5: Resumen final
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('✅ Migración completada exitosamente');
    console.log('═════════════════════════════════════════════════════');
    console.log(`📊 Estadísticas:`);
    console.log(`   • Mundos: ${worldsFromFile.length} archivos, ${migratedWorlds} migrados, ${skippedWorlds} omitidos, ${errorWorlds} errores`);
    console.log(`   • Pueblos: ${pueblosFromFile.length} archivos, ${migratedPueblos} migrados, ${skippedPueblos} omitidos, ${errorPueblos} errores`);
    console.log(`   • Edificios: ${edificiosFromFile.length} archivos, ${migratedEdificios} migrados, ${skippedEdificios} omitidos, ${errorEdificios} errores`);
    console.log(`\n📁 Backup de archivos JSON guardado en:`);
    console.log(`   ${backupPath}`);
    console.log(`\n💡 Siguiente paso:`);
    console.log(`   Los archivos JSON originales en data-esparcraft/worlds/,`);
    console.log(`   data-esparcraft/pueblos/ y data-esparcraft/edificios/`);
    console.log(`   ya no son necesarios, pero se recomienda mantenerlos`);
    console.log(`   como respaldo hasta verificar que todo funciona correctamente.`);
    console.log('═════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateWorldPuebloEdificio();

#!/usr/bin/env bun
/**
 * Script de migración de NPCs desde archivos JSON a base de datos
 *
 * Este script:
 * 1. Lee todos los NPCs de los archivos JSON en data-esparcraft/npcs/
 * 2. Los migra a la base de datos SQLite usando Prisma
 * 3. Crea un respaldo de seguridad de los archivos JSON originales
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { NPC } from '../src/lib/types';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');
const BACKUP_DIR = path.join(process.cwd(), 'db', 'npcs-backup');

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
async function migrateNPCs() {
  console.log('🚀 Iniciando migración de NPCs a base de datos...\n');

  try {
    // Paso 1: Leer NPCs de archivos JSON
    console.log('📂 Leyendo NPCs de archivos JSON...');
    const npcFiles = listFiles(path.join(DATA_DIR, 'npcs'));
    console.log(`   Encontrados ${npcFiles.length} archivos JSON de NPCs\n`);

    const npcsFromFile: NPC[] = [];
    for (const file of npcFiles) {
      const npc = readJSON<NPC>(path.join(DATA_DIR, 'npcs', file));
      if (npc) {
        npcsFromFile.push(npc);
        console.log(`   ✓ Cargado: ${npc.id} (${file})`);
      }
    }

    console.log(`\n   Total de NPCs cargados: ${npcsFromFile.length}\n`);

    // Paso 2: Verificar NPCs existentes en la DB
    console.log('🔍 Verificando NPCs existentes en la base de datos...');
    const existingNPCs = await prisma.nPC.findMany({
      select: { id: true }
    });
    const existingIds = new Set(existingNPCs.map(n => n.id));
    console.log(`   NPCs existentes en DB: ${existingIds.size}\n`);

    // Paso 3: Migrar NPCs nuevos
    console.log('💾 Migrando NPCs a la base de datos...');
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const npc of npcsFromFile) {
      if (existingIds.has(npc.id)) {
        console.log(`   ⊘ Omitido (ya existe): ${npc.id}`);
        skippedCount++;
        continue;
      }

      try {
        await prisma.nPC.create({
          data: {
            id: npc.id,
            locationScope: npc.location.scope,
            worldId: npc.location.worldId,
            puebloId: npc.location.puebloId || null,
            edificioId: npc.location.edificioId || null,
            card: JSON.stringify(npc.card),
          }
        });
        console.log(`   ✓ Migrado: ${npc.id}`);
        migratedCount++;
      } catch (error) {
        console.error(`   ✗ Error migrando ${npc.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n   Migrados: ${migratedCount}`);
    console.log(`   Omitidos (ya existían): ${skippedCount}`);
    console.log(`   Errores: ${errorCount}\n`);

    // Paso 4: Crear backup de los archivos JSON
    console.log('💾 Creando backup de archivos JSON...');
    ensureDir(BACKUP_DIR);
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `npcs-backup-${backupTimestamp}`);

    ensureDir(backupPath);

    for (const file of npcFiles) {
      const sourcePath = path.join(DATA_DIR, 'npcs', file);
      const targetPath = path.join(backupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`   ✓ Backup: ${file}`);
    }

    console.log(`\n   Backup creado en: ${backupPath}\n`);

    // Paso 5: Resumen final
    console.log('═════════════════════════════════════════════════════');
    console.log('✅ Migración completada exitosamente');
    console.log('═════════════════════════════════════════════════════');
    console.log(`📊 Estadísticas:`);
    console.log(`   • Total de NPCs en archivos: ${npcsFromFile.length}`);
    console.log(`   • NPCs migrados a DB: ${migratedCount}`);
    console.log(`   • NPCs ya existentes: ${skippedCount}`);
    console.log(`   • Errores: ${errorCount}`);
    console.log(`\n📁 Backup de archivos JSON guardado en:`);
    console.log(`   ${backupPath}`);
    console.log(`\n💡 Siguiente paso:`);
    console.log(`   Los archivos JSON originales en data-esparcraft/npcs/`);
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
migrateNPCs();

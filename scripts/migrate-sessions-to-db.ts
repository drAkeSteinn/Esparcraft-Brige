#!/usr/bin/env bun
/**
 * Script de migración de Sesiones y Resúmenes desde archivos JSON a base de datos
 *
 * Este script:
 * 1. Lee todas las sesiones de los archivos JSON en data-esparcraft/sessions/
 * 2. Migra summaryHistory de cada sesión como SessionSummary entries
 * 3. Migra la sesión a la base de datos SQLite usando Prisma
 * 4. Lee resúmenes independientes de data-esparcraft/sessions/summaries/
 * 5. Migra resúmenes adicionales a la base de datos
 * 6. Crea un respaldo de seguridad de los archivos JSON originales
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');
const BACKUP_DIR = path.join(process.cwd(), 'db', 'sessions-backup');

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
async function migrateSessions() {
  console.log('🚀 Iniciando migración de Sesiones y Resúmenes a base de datos...\n');

  try {
    // ============================================================
    // FASE 1: Migración de Sesiones
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 1: Migración de Sesiones');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📂 Leyendo sesiones de archivos JSON...');
    const sessionFiles = listFiles(path.join(DATA_DIR, 'sessions'));
    console.log(`   Encontrados ${sessionFiles.length} archivos JSON de sesiones\n`);

    const sessionsFromFile: any[] = [];
    for (const file of sessionFiles) {
      const session = readJSON<any>(path.join(DATA_DIR, 'sessions', file));
      if (session) {
        sessionsFromFile.push(session);
        console.log(`   ✓ Cargado: ${session.id} (${file})`);
      }
    }

    console.log(`\n   Total de sesiones cargadas: ${sessionsFromFile.length}\n`);

    console.log('🔍 Verificando sesiones existentes en la base de datos...');
    const existingSessions = await prisma.session.findMany({
      select: { id: true }
    });
    const existingSessionIds = new Set(existingSessions.map(s => s.id));
    console.log(`   Sesiones existentes en DB: ${existingSessionIds.size}\n`);

    console.log('💾 Migrando sesiones a la base de datos...');
    let migratedSessions = 0;
    let skippedSessions = 0;
    let errorSessions = 0;

    for (const session of sessionsFromFile) {
      if (existingSessionIds.has(session.id)) {
        console.log(`   ⊘ Omitido (ya existe): ${session.id}`);
        skippedSessions++;
        continue;
      }

      try {
        // Primero migrar summaryHistory si existe
        let latestSummaryId: string | null = null;
        let latestSummaryText: string | null = null;

        if (session.summaryHistory && Array.isArray(session.summaryHistory) && session.summaryHistory.length > 0) {
          console.log(`   ↳ Migrando ${session.summaryHistory.length} resúmenes de ${session.id}...`);
          
          for (const historyEntry of session.summaryHistory) {
            const summaryCreated = await prisma.sessionSummary.create({
              data: {
                sessionId: session.id,
                npcId: session.npcId,
                playerId: session.playerId || null,
                playerName: session.jugador?.nombre || null,
                npcName: null, // NPC name would need to be fetched from NPC
                summary: historyEntry.summary,
                timestamp: new Date(historyEntry.timestamp),
                version: historyEntry.version,
              }
            });
            console.log(`      ✓ Resumen versión ${historyEntry.version} migrado (ID: ${summaryCreated.id})`);
            
            // Guardar ID del último resumen
            if (historyEntry.version === session.summaryHistory.length || !latestSummaryId) {
              latestSummaryId = summaryCreated.id;
              latestSummaryText = historyEntry.summary;
            }
          }
        }

        // Migrar la sesión
        await prisma.session.create({
          data: {
            id: session.id,
            npcId: session.npcId,
            playerId: session.playerId || null,
            jugador: JSON.stringify(session.jugador),
            startTime: new Date(session.startTime),
            lastActivity: new Date(session.lastActivity),
            messages: JSON.stringify(session.messages || []),
            lastPrompt: session.lastPrompt || null,
            summary: latestSummaryText || null,
            summaryId: latestSummaryId,
          }
        });
        console.log(`   ✓ Migrada: ${session.id}`);
        migratedSessions++;
      } catch (error) {
        console.error(`   ✗ Error migrando ${session.id}:`, error);
        errorSessions++;
      }
    }

    console.log(`\n   Sesiones migradas: ${migratedSessions}`);
    console.log(`   Sesiones omitidas (ya existían): ${skippedSessions}`);
    console.log(`   Errores: ${errorSessions}\n`);

    // ============================================================
    // FASE 2: Migración de Resúmenes Independientes
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 2: Migración de Resúmenes Independientes');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📂 Leyendo resúmenes de archivos JSON...');
    const summaryFiles = listFiles(path.join(DATA_DIR, 'sessions', 'summaries'));
    console.log(`   Encontrados ${summaryFiles.length} archivos JSON de resúmenes\n`);

    const summariesFromFile: any[] = [];
    for (const file of summaryFiles) {
      const summary = readJSON<any>(path.join(DATA_DIR, 'sessions', 'summaries', file));
      if (summary) {
        summariesFromFile.push(summary);
        console.log(`   ✓ Cargado: ${summary.sessionId} (${file})`);
      }
    }

    console.log(`\n   Total de resúmenes cargados: ${summariesFromFile.length}\n`);

    console.log('🔍 Verificando resúmenes existentes en la base de datos...');
    const existingSummaries = await prisma.sessionSummary.findMany({
      select: { sessionId: true, version: true }
    });
    
    // Crear mapa de resúmenes existentes para evitar duplicados
    const existingSummaryKey = new Set(
      existingSummaries.map(s => `${s.sessionId}-v${s.version}`)
    );
    
    console.log(`   Resúmenes existentes en DB: ${existingSummaryKey.size}\n`);

    console.log('💾 Migrando resúmenes adicionales a la base de datos...');
    let migratedSummaries = 0;
    let skippedSummaries = 0;
    let errorSummaries = 0;

    for (const summary of summariesFromFile) {
      const summaryKey = `${summary.sessionId}-v${summary.version}`;
      
      if (existingSummaryKey.has(summaryKey)) {
        console.log(`   ⊘ Omitido (ya existe): ${summary.sessionId} versión ${summary.version}`);
        skippedSummaries++;
        continue;
      }

      try {
        await prisma.sessionSummary.create({
          data: {
            sessionId: summary.sessionId,
            npcId: summary.npcId,
            playerId: summary.playerId || null,
            playerName: summary.playerName || null,
            npcName: summary.npcName || null,
            summary: summary.summary,
            timestamp: new Date(summary.timestamp),
            version: summary.version,
          }
        });
        console.log(`   ✓ Migrado: ${summary.sessionId} versión ${summary.version}`);
        migratedSummaries++;
      } catch (error) {
        console.error(`   ✗ Error migrando resumen de ${summary.sessionId}:`, error);
        errorSummaries++;
      }
    }

    console.log(`\n   Resúmenes migrados: ${migratedSummaries}`);
    console.log(`   Resúmenes omitidos (ya existían): ${skippedSummaries}`);
    console.log(`   Errores: ${errorSummaries}\n`);

    // ============================================================
    // FASE 3: Crear backup de los archivos JSON
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('FASE 3: Creando backup de archivos JSON');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('💾 Creando backup de archivos JSON...');
    ensureDir(BACKUP_DIR);
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${backupTimestamp}`);

    // Backup sesiones
    console.log('\n   Backing up sesiones...');
    const sessionsBackupPath = path.join(backupPath, 'sessions');
    ensureDir(sessionsBackupPath);
    for (const file of sessionFiles) {
      const sourcePath = path.join(DATA_DIR, 'sessions', file);
      const targetPath = path.join(sessionsBackupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
    }
    console.log(`   ✓ ${sessionFiles.length} sesiones backed up`);

    // Backup resúmenes
    console.log('\n   Backing up resúmenes...');
    const summariesBackupPath = path.join(backupPath, 'summaries');
    ensureDir(summariesBackupPath);
    for (const file of summaryFiles) {
      const sourcePath = path.join(DATA_DIR, 'sessions', 'summaries', file);
      const targetPath = path.join(summariesBackupPath, file);
      fs.copyFileSync(sourcePath, targetPath);
    }
    console.log(`   ✓ ${summaryFiles.length} resúmenes backed up`);

    console.log(`\n   Backup creado en: ${backupPath}\n`);

    // ============================================================
    // FASE 4: Resumen final
    // ============================================================
    console.log('═════════════════════════════════════════════════════');
    console.log('✅ Migración completada exitosamente');
    console.log('═════════════════════════════════════════════════════');
    console.log(`📊 Estadísticas:`);
    console.log(`   • Sesiones: ${sessionFiles.length} archivos, ${migratedSessions} migradas, ${skippedSessions} omitidas, ${errorSessions} errores`);
    console.log(`   • Resúmenes del historial: migrados como parte de las sesiones`);
    console.log(`   • Resúmenes independientes: ${summariesFromFile.length} archivos, ${migratedSummaries} migrados, ${skippedSummaries} omitidos, ${errorSummaries} errores`);
    console.log(`\n📁 Backup de archivos JSON guardado en:`);
    console.log(`   ${backupPath}`);
    console.log(`\n💡 Siguiente paso:`);
    console.log(`   Los archivos JSON originales en data-esparcraft/sessions/`);
    console.log(`   y data-esparcraft/sessions/summaries/`);
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
migrateSessions();

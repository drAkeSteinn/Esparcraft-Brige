#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTables() {
  console.log('🔍 Verificando tablas de Session y SessionSummary...\n');

  try {
    // Verificar tablas usando query SQL directa
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('Session', 'SessionSummary', 'NPC', 'World', 'Pueblo', 'Edificio')
      ORDER BY name
    `;

    console.log('📊 Tablas en la base de datos:');
    for (const table of tables) {
      console.log(`   ✓ ${table.name}`);
    }

    // Verificar estructura de Session
    console.log('\n📋 Estructura de tabla Session:');
    const sessionColumns = await prisma.$queryRaw<Array<{ name: string, type: string }>>`
      PRAGMA table_info(Session)
    `;
    
    for (const col of sessionColumns) {
      console.log(`   • ${col.name.padEnd(20)} ${col.type}`);
    }

    // Verificar estructura de SessionSummary
    console.log('\n📋 Estructura de tabla SessionSummary:');
    const summaryColumns = await prisma.$queryRaw<Array<{ name: string, type: string }>>`
      PRAGMA table_info(SessionSummary)
    `;
    
    for (const col of summaryColumns) {
      console.log(`   • ${col.name.padEnd(20)} ${col.type}`);
    }

    // Verificar índices de Session
    console.log('\n🔑 Índices de Session:');
    const sessionIndexes = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='index' 
      AND tbl_name='Session'
      ORDER BY name
    `;
    
    for (const idx of sessionIndexes) {
      console.log(`   • ${idx.name}`);
    }

    // Verificar índices de SessionSummary
    console.log('\n🔑 Índices de SessionSummary:');
    const summaryIndexes = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='index' 
      AND tbl_name='SessionSummary'
      ORDER BY name
    `;
    
    for (const idx of summaryIndexes) {
      console.log(`   • ${idx.name}`);
    }

    // Verificar integridad referencial
    console.log('\n🔗 Relaciones FK:');
    
    const foreignKeys = await prisma.$queryRaw<Array<{ table: string, from: string, to: string, table_to: string }>>`
      SELECT 
        m.name as table,
        fk."from" as "from",
        fk."to" as "to",
        (SELECT name FROM sqlite_master WHERE type='table' AND rowid = fk.table) as table_to
      FROM sqlite_master m
      LEFT OUTER JOIN pragma_foreign_key_list(m.name) fk
      WHERE m.type='table'
      AND m.name IN ('Session', 'SessionSummary')
      AND fk."from" IS NOT NULL
      ORDER BY m.name, fk."from"
    `;

    for (const fk of foreignKeys) {
      console.log(`   • ${fk.table}.${fk.from} → ${fk.table_to}.${fk.to}`);
    }

    console.log('\n✅ Verificación completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTables();

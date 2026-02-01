#!/usr/bin/env bun
/**
 * Script de inicialización de base de datos
 * Verifica si la DB existe, si no, la crea automáticamente
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

console.log('🔧 Inicializando base de datos...\n');

// Crear directorio db si no existe
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('✅ Directorio db creado');
}

// Verificar si la base de datos existe
const dbExists = existsSync(dbFile);

if (!dbExists) {
  console.log('⚠️  La base de datos no existe');
  console.log('📝 Creando base de datos automáticamente...\n');

  // Paso 1: Crear archivo SQLite vacío
  writeFileSync(dbFile, '');
  console.log('✅ Archivo de base de datos creado');
  console.log(`📍 Ubicación: ${dbFile}`);

  // Paso 2: Generar Prisma Client
  console.log('\n1️⃣  Generando Prisma Client...');
  try {
    const prismaResult = spawnSync(['bun', 'run', 'db:generate'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    });

    if (prismaResult.exitCode !== 0) {
      console.error('❌ Error generando Prisma Client');
      console.error(prismaResult.stderr.toString());
    } else {
      console.log('✅ Prisma Client generado');
    }
  } catch (error) {
    console.error('❌ Error generando Prisma Client:', error);
  }

  // Paso 3: Aplicar schema
  console.log('\n2️⃣  Aplicando schema a la base de datos...');
  try {
    const pushResult = spawnSync(['bun', 'run', 'db:push'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    });

    if (pushResult.exitCode !== 0) {
      console.error('❌ Error aplicando schema');
      console.error(pushResult.stderr.toString());
    } else {
      console.log('✅ Schema aplicado correctamente');
    }
  } catch (error) {
    console.error('❌ Error aplicando schema:', error);
  }
} else {
  console.log('✅ Base de datos ya existe');
  console.log(`📍 Ubicación: ${dbFile}`);
}

console.log('\n🎉 Inicialización de base de datos completada');


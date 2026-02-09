#!/usr/bin/env bun
/**
 * Script para crear la base de datos desde cero
 * Genera Prisma Client y aplica el schema
 */

import { spawnSync } from 'child_process';

console.log('📝 Creando base de datos desde cero...\n');

// Paso 1: Generar Prisma Client
console.log('1️⃣  Generando Prisma Client...');
try {
  const prismaResult = spawnSync(['bun', 'run', 'db:generate'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (prismaResult.exitCode !== 0) {
    console.error('❌ Error generando Prisma Client');
    console.error(prismaResult.stderr.toString());
    process.exit(1);
  }
  console.log('✅ Prisma Client generado\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

// Paso 2: Aplicar schema a la base de datos
console.log('2️⃣  Aplicando schema a la base de datos...');
try {
  const pushResult = spawnSync(['bun', 'run', 'db:push'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (pushResult.exitCode !== 0) {
    console.error('❌ Error aplicando schema');
    console.error(pushResult.stderr.toString());
    process.exit(1);
  }
  console.log('✅ Schema aplicado correctamente\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('🎉 Base de datos creada exitosamente');
console.log('📍 Ubicación: db/custom.db');
console.log('\n💡 Ya puedes iniciar el servidor con: bun run dev');

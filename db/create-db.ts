#!/usr/bin/env bun
/**
 * Script para crear la base de datos desde cero
 * Genera Prisma Client y aplica el schema
 * Úsalo para inicializar una base de datos en una nueva instalación
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const dbDir = join(process.cwd(), 'db');
const dbFile = join(dbDir, 'custom.db');

console.log('📝 Creando base de datos desde cero...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Paso 1: Crear directorio
console.log('1️⃣  Verificando/creando directorio...\n');

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('✅ Directorio db creado');
  console.log(`📍 ${dbDir}\n`);
} else {
  console.log('✅ Directorio db ya existe');
  console.log(`📍 ${dbDir}\n`);
}

// Paso 2: Verificar si la base de datos ya existe
if (existsSync(dbFile)) {
  console.log('⚠️  La base de datos ya existe');
  console.log(`📍 ${dbFile}\n`);
  console.log('💡 Opciones:');
  console.log('   • Para crear una DB nueva, renombra o elimina la actual');
  console.log('   • O usa el script de restauración: bun run db:restore <backup>\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('¿Deseas eliminar la base de datos actual y crear una nueva? (si/no): ', (ans) => {
      rl.close();
      resolve(ans.toLowerCase());
    });
  });

  if (answer !== 'si' && answer !== 's' && answer !== 'y' && answer !== 'yes') {
    console.log('\n❌ Cancelado. No se eliminó la base de datos.');
    process.exit(0);
  }

  console.log('\n🗑️  Eliminando base de datos actual...\n');
  try {
    const fs = await import('fs');
    fs.unlinkSync(dbFile);
    console.log('✅ Base de datos eliminada');
  } catch (error) {
    console.error('❌ Error eliminando la base de datos:', error);
    process.exit(1);
  }
}

// Paso 3: Crear archivo SQLite vacío
console.log('2️⃣  Creando archivo SQLite vacío...\n');

try {
  writeFileSync(dbFile, '');
  console.log('✅ Archivo de base de datos creado');
  console.log(`📍 ${dbFile}\n`);
} catch (error) {
  console.error('❌ Error creando el archivo:', error);
  process.exit(1);
}

// Paso 4: Generar Prisma Client
console.log('3️⃣  Generando Prisma Client...\n');

try {
  const { spawnSync } = await import('child_process');
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

  console.log('✅ Prisma Client generado exitosamente\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

// Paso 5: Aplicar schema a la base de datos
console.log('4️⃣  Aplicando schema de Prisma a la base de datos...\n');

try {
  const { spawnSync } = await import('child_process');
  const pushResult = spawnSync(['bun', 'run', 'db:push'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (pushResult.exitCode !== 0) {
    console.error('❌ Error aplicando el schema');
    console.error(pushResult.stderr.toString());
    process.exit(1);
  }

  console.log('✅ Schema aplicado correctamente\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🎉 Base de datos creada exitosamente\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📍 Ubicación: db/custom.db');
console.log('📋 Schema: prisma/schema.prisma');
console.log('\n💡 Próximos pasos:');
console.log('   1. Inicia el servidor: bun run dev');
console.log('   2. La base de datos estará vacía y lista para usar');
console.log('   3. Para restaurar datos de un backup: bun run db:restore <archivo>');
console.log('   4. Para crear un backup manual: bun run db:backup "descripción"\n');

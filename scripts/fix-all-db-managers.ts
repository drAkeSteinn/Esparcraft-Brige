#!/usr/bin/env bun
/**
 * Script para corregir todos los managers de base de datos para usar db compartido
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const libDir = join(process.cwd(), 'src', 'lib');

// Managers que necesitan corrección
const dbManagers = [
  'worldDbManager.ts',
  'puebloDbManager.ts',
  'edificioDbManager.ts',
  'npcDbManager.ts',
  'sessionDbManager.ts',
  'sessionSummaryDbManager.ts',
];

console.log('🔧 Corrigiendo managers para usar db compartido...\n');

let totalFixed = 0;

for (const managerFile of dbManagers) {
  const filePath = join(libDir, managerFile);

  try {
    if (!require('fs').existsSync(filePath)) {
      console.log(`⊘ Omitido (no existe): ${managerFile}`);
      continue;
    }

    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // 1. Reemplazar import de PrismaClient por import de db
    if (content.includes("import { PrismaClient } from '@prisma/client'")) {
      content = content.replace(
        /import \{ PrismaClient \} from '@prisma\/client';/g,
        "import { db } from '@/lib/db';"
      );
      modified = true;
      console.log(`   ✓ Import cambiado en ${managerFile}`);
    }

    // 2. Remover el código de singleton de Prisma Client
    const singletonPattern = /\/\/ Singleton pattern para Prisma Client[^]*if \(process\.env\.NODE_ENV !== 'production'\) \{[^}]*\}/gs;
    if (singletonPattern.test(content)) {
      content = content.replace(singletonPattern, '');
      modified = true;
      console.log(`   ✓ Singleton Prisma removido en ${managerFile}`);
    }

    // 3. Reemplazar todas las referencias a prisma.<tabla> por db.<tabla>
    const prismaCallPattern = /prisma\.(world|pueblo|edificio|nPc|session|sessionSummary)/g;
    if (prismaCallPattern.test(content)) {
      content = content.replace(prismaCallPattern, (match, table) => {
        // Normalizar nombres: nPc → npc, sessionSummary → sessionSummary
        const normalizedTable = table === 'nPc' ? 'npc' : table;
        return `db.${normalizedTable}`;
      });
      modified = true;
      console.log(`   ✓ Llamadas prisma reemplazadas en ${managerFile}`);
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
      console.log(`   ✅ ${managerFile} corregido\n`);
    }
  } catch (error) {
    console.error(`   ✗ Error corrigiendo ${managerFile}:`, error);
  }
}

console.log(`\n📊 Managers corregidos: ${totalFixed}`);
console.log(`\n✅ Corrección completada`);

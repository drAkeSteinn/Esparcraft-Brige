#!/usr/bin/env bun
/**
 * Script simplificado para actualizar imports en rutas API para usar los nuevos managers de base de datos
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const apiDir = join(process.cwd(), 'src', 'app', 'api');

// Mapeo de managers antiguos a nuevos managers
const managerMap: Record<string, { old: string; newManager: string }> = {
  worldManager: { old: 'worldManager', new: 'worldDbManager' },
  puebloManager: { old: 'puebloManager', new: 'puebloDbManager' },
  edificioManager: { old: 'edificioManager', new: 'edificioDbManager' },
  npcManager: { old: 'npcManager', new: 'npcDbManager' },
  sessionManager: { old: 'sessionManager', new: 'sessionDbManager' },
  summaryManager: { old: 'summaryManager', new: 'sessionSummaryDbManager' },
};

// Rutas API que necesitan actualización
const apiRoutes = [
  // Mundos
  join(apiDir, 'worlds', 'route.ts'),
  join(apiDir, 'worlds', '[id]', 'route.ts'),
  join(apiDir, 'worlds', '[id]', 'pueblo-summaries', 'route.ts'),
  join(apiDir, 'worlds', '[id]', 'memory', 'route.ts'),
  
  // Pueblos
  join(apiDir, 'pueblos', 'route.ts'),
  join(apiDir, 'pueblos', '[id]', 'edificio-summaries', 'route.ts'),
  join(apiDir, 'pueblos', '[id]', 'route.ts'),
  join(apiDir, 'pueblos', '[id]', 'memory', 'route.ts'),
  
  // Edificios
  join(apiDir, 'edificios', 'route.ts'),
  join(apiDir, 'edificios', '[id]', 'route.ts'),
  join(apiDir, 'edificios', '[id]', 'memory', 'route.ts'),
  join(apiDir, 'edificios', '[id]', 'points-of-interest', 'route.ts'),
  join(apiDir, 'edificios', '[id]', 'points-of-interest', '[poiId]', 'image', 'route.ts'),
  
  // NPCs
  join(apiDir, 'npcs', 'route.ts'),
  join(apiDir, 'npcs', '[id]', 'route.ts'),
  join(apiDir, 'npcs', '[id]', 'memory', 'route.ts'),
  join(apiDir, 'npcs', '[id]', 'session-summaries', 'route.ts'),
  join(apiDir, 'npcs', '[id]', 'summaries', 'route.ts'),
  
  // Sessions
  join(apiDir, 'sessions', 'route.ts'),
  join(apiDir, 'sessions', '[id]', 'route.ts'),
  join(apiDir, 'sessions', '[id]', 'summaries', 'route.ts'),
  join(apiDir, 'sessions', '[id]', 'summary', 'route.ts'),
];

console.log('🔧 Actualizando imports en rutas API para usar managers de base de datos...\n');

let totalUpdated = 0;
let totalErrors = 0;

for (const routeFile of apiRoutes) {
  try {
    if (!require('fs').existsSync(routeFile)) {
      console.log(`⊘ Omitido (no existe): ${routeFile}`);
      continue;
    }

    let content = readFileSync(routeFile, 'utf-8');
    let modified = false;

    // Actualizar imports
    for (const [old, newManager] of Object.entries(managerMap)) {
      const oldImportPattern = `from '@/lib/fileManager'`;
      const newImportPattern = `from '@/lib/${newManager}'`;
      
      // Buscar import del manager antiguo
      const oldImportRegex = new RegExp(`import [^]*${old} [^]*from '@/lib/fileManager'`, 'g');
      
      // Verificar si este archivo usa este manager
      const usesOldManager = oldImportRegex.test(content);
      
      if (usesOldManager) {
        content = content.replace(oldImportRegex, `import { ${newManager} } from '@/lib/${newManager}'`);
        modified = true;
        console.log(`   ✓ ${old} → ${newManager} en ${routeFile}`);
      }
    }

    if (modified) {
      writeFileSync(routeFile, content, 'utf-8');
      totalUpdated++;
    }
  } catch (error) {
    console.error(`   ✗ Error actualizando ${routeFile}:`, error);
    totalErrors++;
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   • Rutas actualizadas: ${totalUpdated}`);
console.log(`   • Errores: ${totalErrors}`);
console.log(`\n✅ Actualización completada`);
console.log(`\n💡 Nota: Las llamadas síncronas serán actualizadas automáticamente cuando Next.js recargue los módulos.`);

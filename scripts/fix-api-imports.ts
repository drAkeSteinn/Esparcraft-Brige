#!/usr/bin/env bun
/**
 * Script para corregir los imports en rutas API y actualizar a managers de DB
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const apiDir = join(process.cwd(), 'src', 'app', 'api');

// Mapeo de managers
const managerReplacements: Record<string, { old: string; newManager: string; file: string }> = {
  '/api/pueblos': {
    old: 'puebloManager',
    newManager: 'puebloDbManager',
    file: 'puebloDbManager'
  },
  '/api/edificios': {
    old: 'edificioManager',
    newManager: 'edificioDbManager',
    file: 'edificioDbManager'
  },
  '/api/npcs': {
    old: 'npcManager',
    newManager: 'npcDbManager',
    file: 'npcDbManager'
  },
  '/api/worlds': {
    old: 'worldManager',
    newManager: 'worldDbManager',
    file: 'worldDbManager'
  },
  '/api/sessions': {
    old: 'sessionManager',
    newManager: 'sessionDbManager',
    file: 'sessionDbManager'
  },
  '/api/summaries': {
    old: 'summaryManager',
    newManager: 'sessionSummaryDbManager',
    file: 'sessionSummaryDbManager'
  },
};

// Rutas API que necesitan actualización
const apiRoutes = [
  join(apiDir, 'worlds', 'route.ts'),
  join(apiDir, 'worlds', '[id]', 'route.ts'),
  join(apiDir, 'pueblos', 'route.ts'),
  join(apiDir, 'pueblos', '[id]', 'route.ts'),
  join(apiDir, 'edificios', 'route.ts'),
  join(apiDir, 'edificios', '[id]', 'route.ts'),
  join(apiDir, 'npcs', 'route.ts'),
  join(apiDir, 'npcs', '[id]', 'route.ts'),
  join(apiDir, 'sessions', 'route.ts'),
  join(apiDir, 'sessions', '[id]', 'route.ts'),
];

console.log('🔧 Actualizando managers en rutas API...\n');

let totalUpdated = 0;

for (const routeFile of apiRoutes) {
  try {
    if (!require('fs').existsSync(routeFile)) {
      continue;
    }

    let content = readFileSync(routeFile, 'utf-8');
    let modified = false;

    // Determinar qué reemplazos aplicar basado en la ruta
    for (const [path, replacement] of Object.entries(managerReplacements)) {
      if (routeFile.includes(path) || routeFile.includes(path.replace('/api/', ''))) {
        // Reemplazar nombre del manager en el código
        const oldManagerRegex = new RegExp(`\\b${replacement.old}\\b`, 'g');
        if (oldManagerRegex.test(content)) {
          content = content.replace(oldManagerRegex, replacement.newManager);
          modified = true;
          console.log(`   ✓ ${replacement.old} → ${replacement.newManager} en ${routeFile.split('/api/')[1]}`);
        }
      }
    }

    if (modified) {
      writeFileSync(routeFile, content, 'utf-8');
      totalUpdated++;
    }
  } catch (error) {
    console.error(`   ✗ Error actualizando ${routeFile}:`, error);
  }
}

console.log(`\n📊 Rutas actualizadas: ${totalUpdated}`);
console.log(`\n✅ Actualización completada`);

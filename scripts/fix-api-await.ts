#!/usr/bin/env bun
/**
 * Script para agregar await a llamadas de managers y corregir imports en rutas API
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const apiDir = join(process.cwd(), 'src', 'app', 'api');

// Managers que necesitan await
const dbManagers = [
  'worldDbManager',
  'puebloDbManager',
  'edificioDbManager',
  'npcDbManager',
  'sessionDbManager',
  'sessionSummaryDbManager'
];

// Rutas API a procesar
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

console.log('🔧 Agregando await a llamadas de managers y corrigiendo imports...\n');

let totalUpdated = 0;

for (const routeFile of apiRoutes) {
  try {
    if (!require('fs').existsSync(routeFile)) {
      continue;
    }

    let content = readFileSync(routeFile, 'utf-8');
    let modified = false;

    // 1. Agregar imports faltantes si existen en el código
    const needsNextRequest = content.includes('NextRequest') && !content.includes("import { NextRequest");
    const needsNextResponse = content.includes('NextResponse') && !content.includes("import { NextResponse") || content.includes("import NextResponse");

    if (needsNextRequest && !content.includes("import { NextRequest,")) {
      // Agregar NextRequest al import existente de NextResponse
      content = content.replace(
        /import \{ NextResponse \} from 'next\/server';/g,
        "import { NextRequest, NextResponse } from 'next/server';"
      );
      modified = true;
    } else if (needsNextResponse) {
      content = content.replace(
        /import \{ NextRequest \} from 'next\/server';/g,
        "import { NextRequest, NextResponse } from 'next/server';"
      );
      modified = true;
    }

    // 2. Agregar await a llamadas de managers que no lo tienen
    for (const manager of dbManagers) {
      if (content.includes(manager)) {
        // Patrón: nombreManager.metodo( sin await antes
        const regex = new RegExp(`(?!await\\s+)${manager}\\.(get|create|update|delete|add|clear)`, 'g');

        if (regex.test(content)) {
          content = content.replace(regex, `await ${manager}.$1`);
          modified = true;
        }
      }
    }

    if (modified) {
      writeFileSync(routeFile, content, 'utf-8');
      totalUpdated++;
      console.log(`   ✓ Actualizado: ${routeFile.split('/api/')[1]}`);
    }
  } catch (error) {
    console.error(`   ✗ Error actualizando ${routeFile}:`, error);
  }
}

console.log(`\n📊 Rutas actualizadas: ${totalUpdated}`);
console.log(`\n✅ Actualización completada`);

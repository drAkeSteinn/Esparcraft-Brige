#!/usr/bin/env bun
/**
 * Script para migrar todos los datos de archivos JSON a la base de datos
 * Migra worlds, pueblos, edificios y npcs que no existen en la DB
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface World {
  id: string;
  name: string;
  lore: any;
  area?: any;
}

interface Pueblo {
  id: string;
  worldId: string;
  name: string;
  type: 'pueblo' | 'nacion';
  description: string;
  lore: any;
  area?: any;
}

interface Edificio {
  id: string;
  worldId: string;
  puebloId: string;
  name: string;
  lore: string;
  rumores?: string;
  eventos_recientes?: string;
  area: any;
  puntosDeInteres?: string;
}

interface NPC {
  id: string;
  locationScope: 'mundo' | 'pueblo' | 'edificio';
  worldId: string;
  puebloId?: string;
  edificioId?: string;
  card: any;
}

const DATA_DIR = 'data-esparcraft';

// Función para leer todos los archivos de un directorio
function readJSONFiles<T>(dir: string): T[] {
  const fs = require('fs');
  const files = fs.readdirSync(join(process.cwd(), dir));

  return files
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const data = fs.readFileSync(join(process.cwd(), dir, file), 'utf-8');
      return JSON.parse(data);
    })
    .filter((item): item is T => item !== null);
}

// Función para verificar si existe en DB
async function existsInDB(manager: any, id: string): Promise<boolean> {
  try {
    const existing = await manager.getById(id);
    return existing !== null;
  } catch (error) {
    return false;
  }
}

// Función para migrar World
async function migrateWorld(world: World): Promise<boolean> {
  const { worldDbManager } = await import('@/lib/worldDbManager');
  
  if (await existsInDB(worldDbManager, world.id)) {
    console.log(`⏭️  World ${world.id} (${world.name}) ya existe en DB, omitiendo`);
    return false;
  }

  try {
    await worldDbManager.create(world);
    console.log(`✅ World migrado: ${world.id} (${world.name})`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrando world ${world.id}:`, error);
    return false;
  }
}

// Función para migrar Pueblo
async function migratePueblo(pueblo: Pueblo): Promise<boolean> {
  const { puebloDbManager } = await import('@/lib/puebloDbManager');
  
  if (await existsInDB(puebloDbManager, pueblo.id)) {
    console.log(`⏭️  Pueblo ${pueblo.id} (${pueblo.name}) ya existe en DB, omitiendo`);
    return false;
  }

  try {
    await puebloDbManager.create(pueblo);
    console.log(`✅ Pueblo migrado: ${pueblo.id} (${pueblo.name})`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrando pueblo ${pueblo.id}:`, error);
    return false;
  }
}

// Función para migrar Edificio
async function migrateEdificio(edificio: Edificio): Promise<boolean> {
  const { edificioDbManager } = await import('@/lib/edificioDbManager');
  
  if (await existsInDB(edificioDbManager, edificio.id)) {
    console.log(`⏭️  Edificio ${edificio.id} (${edificio.name}) ya existe en DB, omitiendo`);
    return false;
  }

  try {
    await edificioDbManager.create(edificio);
    console.log(`✅ Edificio migrado: ${edificio.id} (${edificio.name})`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrando edificio ${edificio.id}:`, error);
    return false;
  }
}

// Función para migrar NPC
async function migrateNPC(npc: NPC): Promise<boolean> {
  const { npcDbManager } = await import('@/lib/npcDbManager');
  
  if (await existsInDB(npcDbManager, npc.id)) {
    console.log(`⏭️  NPC ${npc.id} ya existe en DB, omitiendo`);
    return false;
  }

  try {
    // Extraer nombre de la card para referencia
    const cardData = typeof npc.card === 'string' 
      ? JSON.parse(npc.card) 
      : npc.card;
    const npcName = cardData?.name || 'NPC';

    await npcDbManager.create(npc);
    console.log(`✅ NPC migrado: ${npc.id} (${npcName})`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrando NPC ${npc.id}:`, error);
    return false;
  }
}

// Función principal de migración
async function migrateAll() {
  console.log('🔄 Iniciando migración de datos JSON a base de datos...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Contadores
  let migratedWorlds = 0;
  let migratedPueblos = 0;
  let migratedEdificios = 0;
  let migratedNPCs = 0;
  let skipped = 0;

  // Migrar Worlds
  console.log('🌍 Migrando Worlds...\n');
  const worlds = readJSONFiles<World>(join(DATA_DIR, 'worlds'));
  
  for (const world of worlds) {
    if (await migrateWorld(world)) {
      migratedWorlds++;
    } else {
      skipped++;
    }
  }
  
  console.log(`📊 Worlds: ${migratedWorlds} migrados, ${skipped} omitidos\n`);

  // Migrar Pueblos
  console.log('🏘️ Migrando Pueblos...\n');
  const pueblos = readJSONFiles<Pueblo>(join(DATA_DIR, 'pueblos'));
  
  for (const pueblo of pueblos) {
    if (await migratePueblo(pueblo)) {
      migratedPueblos++;
    } else {
      skipped++;
    }
  }
  
  console.log(`📊 Pueblos: ${migratedPueblos} migrados, ${skipped} omitidos\n`);

  // Migrar Edificios
  console.log('🏢 Migrando Edificios...\n');
  const edificios = readJSONFiles<Edificio>(join(DATA_DIR, 'edificios'));
  
  for (const edificio of edificios) {
    if (await migrateEdificio(edificio)) {
      migratedEdificios++;
    } else {
      skipped++;
    }
  }
  
  console.log(`📊 Edificios: ${migratedEdificios} migrados, ${skipped} omitidos\n`);

  // Migrar NPCs
  console.log('👥 Migrando NPCs...\n');
  const npcs = readJSONFiles<NPC>(join(DATA_DIR, 'npcs'));
  
  for (const npc of npcs) {
    if (await migrateNPC(npc)) {
      migratedNPCs++;
    } else {
      skipped++;
    }
  }
  
  console.log(`📊 NPCs: ${migratedNPCs} migrados, ${skipped} omitidos\n`);

  // Resumen final
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 RESUMEN DE MIGRACIÓN:\n');
  console.log(`🌍  Worlds: ${migratedWorlds} migrados, ${skipped} omitidos`);
  console.log(`🏘️  Pueblos: ${migratedPueblos} migrados, ${skipped} omitidos`);
  console.log(`🏢  Edificios: ${migratedEdificios} migrados, ${skipped} omitidos`);
  console.log(`👥  NPCs: ${migratedNPCs} migrados, ${skipped} omitidos`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`🎉 Total migrados: ${migratedWorlds + migratedPueblos + migratedEdificios + migratedNPCs}`);
  console.log(`📝 Total omitidos (ya existían en DB): ${skipped}\n`);
}

// Ejecutar migración
migrateAll()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });

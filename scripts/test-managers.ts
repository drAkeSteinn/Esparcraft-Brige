#!/usr/bin/env bun
import { worldDbManager } from '../src/lib/worldDbManager';
import { puebloDbManager } from '../src/lib/puebloDbManager';
import { edificioDbManager } from '../src/lib/edificioDbManager';
import { npcDbManager } from '../src/lib/npcDbManager';

async function testManagers() {
  console.log('🧪 Probando managers de base de datos...\n');

  try {
    // Test World Manager
    console.log('🌍 World Manager:');
    const worlds = await worldDbManager.getAll();
    console.log(`   getAll(): ${worlds.length} mundos`);
    
    if (worlds.length > 0) {
      const world = await worldDbManager.getById(worlds[0].id);
      console.log(`   getById(${worlds[0].id}): ${world?.name || 'not found'}`);
      
      const worldWithPueblos = await worldDbManager.getByIdWithRelations(worlds[0].id);
      console.log(`   getByIdWithRelations(): ${worldWithPueblos?.pueblos.length || 0} pueblos relacionados`);
    }

    // Test Pueblo Manager
    console.log('\n🏘️ Pueblo Manager:');
    const pueblos = await puebloDbManager.getAll();
    console.log(`   getAll(): ${pueblos.length} pueblos`);
    
    if (pueblos.length > 0) {
      const pueblo = await puebloDbManager.getById(pueblos[0].id);
      console.log(`   getById(${pueblos[0].id}): ${pueblo?.name || 'not found'} (${pueblo?.type})`);
      
      const pueblosByWorld = await puebloDbManager.getByWorldId(pueblos[0].worldId);
      console.log(`   getByWorldId(${pueblos[0].worldId}): ${pueblosByWorld.length} pueblos`);
      
      const puebloWithRelations = await puebloDbManager.getByIdWithRelations(pueblos[0].id);
      console.log(`   getByIdWithRelations(): ${puebloWithRelations?.edificios?.length || 0} edificios, ${puebloWithRelations?.npcs?.length || 0} NPCs`);
    }

    // Test Edificio Manager
    console.log('\n🏛️ Edificio Manager:');
    const edificios = await edificioDbManager.getAll();
    console.log(`   getAll(): ${edificios.length} edificios`);
    
    if (edificios.length > 0) {
      const edificio = await edificioDbManager.getById(edificios[0].id);
      console.log(`   getById(${edificios[0].id}): ${edificio?.name || 'not found'}`);
      
      const edificiosByPueblo = await edificioDbManager.getByPuebloId(edificios[0].puebloId);
      console.log(`   getByPuebloId(${edificios[0].puebloId}): ${edificiosByPueblo.length} edificios`);
      
      const edificioWithRelations = await edificioDbManager.getByIdWithRelations(edificios[0].id);
      console.log(`   getByIdWithRelations(): mundo=${edificioWithRelations?.mundo?.name}, pueblo=${edificioWithRelations?.pueblo?.name}, NPCs=${edificioWithRelations?.npcs?.length || 0}`);
    }

    // Test NPC Manager
    console.log('\n👤 NPC Manager:');
    const npcs = await npcDbManager.getAll();
    console.log(`   getAll(): ${npcs.length} NPCs`);
    
    if (npcs.length > 0) {
      const npc = await npcDbManager.getById(npcs[0].id);
      const card = npc?.card?.data || npc?.card || {};
      console.log(`   getById(${npcs[0].id}): ${card.name || 'Unknown'} (${npcs[0].location.scope})`);
      
      const npcsByWorld = await npcDbManager.getByWorldId(npcs[0].location.worldId);
      console.log(`   getByWorldId(${npcs[0].location.worldId}): ${npcsByWorld.length} NPCs`);
      
      if (npcs[0].location.edificioId) {
        const npcsByEdificio = await npcDbManager.getByEdificioId(npcs[0].location.edificioId);
        console.log(`   getByEdificioId(${npcs[0].location.edificioId}): ${npcsByEdificio.length} NPCs`);
      }
    }

    // Test counts
    console.log('\n📊 Counts:');
    const worldCount = await worldDbManager.count();
    const puebloCount = await puebloDbManager.count();
    const edificioCount = await edificioDbManager.count();
    // npcDbManager.count() not available, use getAll().length
    const npcCount = (await npcDbManager.getAll()).length;
    
    console.log(`   Worlds: ${worldCount}`);
    console.log(`   Pueblos: ${puebloCount}`);
    console.log(`   Edificios: ${edificioCount}`);
    console.log(`   NPCs: ${npcCount}`);
    console.log(`   Total: ${worldCount + puebloCount + edificioCount + npcCount} entidades`);

    console.log('\n✅ Todos los tests pasados exitosamente');
  } catch (error) {
    console.error('❌ Error durante tests:', error);
  }
}

testManagers();

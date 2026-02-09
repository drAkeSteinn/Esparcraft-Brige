#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verificando migración...\n');

  try {
    // Verificar mundos
    const worlds = await prisma.world.findMany();
    console.log(`✓ Mundos en DB: ${worlds.length}`);
    for (const w of worlds) {
      console.log(`  - ${w.id}: ${w.name}`);
    }

    // Verificar pueblos
    const pueblos = await prisma.pueblo.findMany();
    console.log(`\n✓ Pueblos en DB: ${pueblos.length}`);
    for (const p of pueblos) {
      console.log(`  - ${p.id}: ${p.name} (worldId: ${p.worldId})`);
    }

    // Verificar edificios
    const edificios = await prisma.edificio.findMany();
    console.log(`\n✓ Edificios en DB: ${edificios.length}`);
    for (const e of edificios) {
      console.log(`  - ${e.id}: ${e.name} (puebloId: ${e.puebloId})`);
    }

    // Verificar NPCs
    const npcs = await prisma.nPC.findMany();
    console.log(`\n✓ NPCs en DB: ${npcs.length}`);
    for (const n of npcs) {
      const scope = n.locationScope;
      const locInfo = scope === 'edificio' ? `(edificio: ${n.edificioId})` : scope === 'pueblo' ? `(pueblo: ${n.puebloId})` : `(mundo)`;
      try {
        const card = JSON.parse(n.card);
        console.log(`  - ${n.id}: ${card.name || card.data?.name || 'Unknown'} ${locInfo}`);
      } catch (e) {
        console.log(`  - ${n.id}: [Error parsing card] ${locInfo}`);
      }
    }

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();

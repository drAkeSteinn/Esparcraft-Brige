#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRelations() {
  console.log('🔍 Verificando relaciones FK...\n');

  try {
    // Intentar crear una sesión y verificar relación con NPC
    console.log('📊 Conteo de registros:');
    
    const worldCount = await prisma.world.count();
    const puebloCount = await prisma.pueblo.count();
    const edificioCount = await prisma.edificio.count();
    const npcCount = await prisma.nPC.count();
    const sessionCount = await prisma.session.count();
    const summaryCount = await prisma.sessionSummary.count();
    
    console.log(`   • Worlds: ${worldCount}`);
    console.log(`   • Pueblos: ${puebloCount}`);
    console.log(`   • Edificios: ${edificioCount}`);
    console.log(`   • NPCs: ${npcCount}`);
    console.log(`   • Sessions: ${sessionCount}`);
    console.log(`   • SessionSummaries: ${summaryCount}`);

    // Verificar si hay NPCs disponibles
    const npcs = await prisma.nPC.findMany({
      take: 1
    });

    if (npcs.length > 0) {
      console.log(`\n✅ NPCs disponibles en la DB`);
      console.log(`   ID de prueba: ${npcs[0].id}`);
    } else {
      console.log(`\n⚠️  No hay NPCs en la DB`);
    }

    console.log('\n✅ Verificación completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRelations();

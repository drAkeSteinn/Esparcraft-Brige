#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySessionMigration() {
  console.log('🔍 Verificando migración de sesiones y resúmenes...\n');

  try {
    // Verificar sesiones
    const sessions = await prisma.session.findMany();
    console.log(`📊 Sesiones en DB: ${sessions.length}`);
    
    for (const session of sessions) {
      console.log(`\n   • ${session.id}`);
      console.log(`     NPC ID: ${session.npcId}`);
      console.log(`     Player ID: ${session.playerId || 'N/A'}`);
      console.log(`     Summary ID: ${session.summaryId || 'N/A'}`);
      console.log(`     Start Time: ${session.startTime.toISOString()}`);
      console.log(`     Last Activity: ${session.lastActivity.toISOString()}`);
      console.log(`     Messages: ${JSON.parse(session.messages).length} mensajes`);
      console.log(`     Has Summary: ${session.summary ? 'Yes' : 'No'}`);
      
      // Deserializar jugador
      const jugador = JSON.parse(session.jugador);
      console.log(`     Jugador: ${jugador.nombre || 'N/A'} (${jugador.raza || 'N/A'}, lvl ${jugador.nivel || 'N/A'})`);
    }

    // Verificar resúmenes
    const summaries = await prisma.sessionSummary.findMany({
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`\n📊 Resúmenes en DB: ${summaries.length}`);
    for (const summary of summaries) {
      console.log(`\n   • ID: ${summary.id}`);
      console.log(`     Session ID: ${summary.sessionId}`);
      console.log(`     NPC ID: ${summary.npcId}`);
      console.log(`     Player: ${summary.playerName || 'N/A'}`);
      console.log(`     NPC: ${summary.npcName || 'N/A'}`);
      console.log(`     Timestamp: ${summary.timestamp.toISOString()}`);
      console.log(`     Version: ${summary.version}`);
      console.log(`     Summary Length: ${summary.summary.length} caracteres`);
      console.log(`     Summary Preview: ${summary.summary.substring(0, 100)}...`);
    }

    // Conteos finales
    console.log('\n📈 Conteos finales:');
    console.log(`   • Worlds: ${await prisma.world.count()}`);
    console.log(`   • Pueblos: ${await prisma.pueblo.count()}`);
    console.log(`   • Edificios: ${await prisma.edificio.count()}`);
    console.log(`   • NPCs: ${await prisma.nPC.count()}`);
    console.log(`   • Sessions: ${await prisma.session.count()}`);
    console.log(`   • SessionSummaries: ${await prisma.sessionSummary.count()}`);
    console.log(`   • Total: ${await prisma.world.count() + await prisma.pueblo.count() + await prisma.edificio.count() + await prisma.nPC.count() + await prisma.session.count() + await prisma.sessionSummary.count()} entidades`);

    console.log('\n✅ Verificación completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySessionMigration();

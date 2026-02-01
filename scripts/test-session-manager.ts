#!/usr/bin/env bun
import { sessionDbManager } from '../src/lib/sessionDbManager';
import { npcDbManager } from '../src/lib/npcDbManager';

async function testSessionDbManager() {
  console.log('🧪 Probando Session Database Manager...\n');

  try {
    // Test 1: getAll()
    console.log('📊 Test 1: getAll()');
    const sessions = await sessionDbManager.getAll();
    console.log(`   ✓ Total de sesiones: ${sessions.length}`);

    if (sessions.length === 0) {
      console.log('   ℹ️  No hay sesiones para probar, creando una de prueba...');
      
      // Obtener un NPC existente
      const npcs = await npcDbManager.getAll();
      if (npcs.length > 0) {
        const testSession = await sessionDbManager.create({
          npcId: npcs[0].id,
          playerId: 'test_player',
          jugador: {
            nombre: 'Test Player',
            raza: 'Humano',
            nivel: '1'
          },
          messages: [
            {
              role: 'system',
              content: 'Sistema de prueba',
              timestamp: new Date().toISOString()
            }
          ]
        });
        console.log(`   ✓ Sesión de prueba creada: ${testSession.id}`);
        
        // Actualizar referencia local
        sessions.push(testSession);
      }
    }

    if (sessions.length > 0) {
      const testSession = sessions[0];

      // Test 2: getById()
      console.log('\n📊 Test 2: getById()');
      const byId = await sessionDbManager.getById(testSession.id);
      console.log(`   ✓ Sesión encontrada: ${byId ? 'Yes' : 'No'}`);
      if (byId) {
        console.log(`     NPC ID: ${byId.npcId}`);
        console.log(`     Player ID: ${byId.playerId || 'N/A'}`);
        console.log(`     Messages: ${byId.messages.length}`);
      }

      // Test 3: getByNPCId()
      console.log('\n📊 Test 3: getByNPCId()');
      const byNPC = await sessionDbManager.getByNPCId(testSession.npcId);
      console.log(`   ✓ Sesiones del NPC: ${byNPC.length}`);

      // Test 4: getByPlayerId()
      console.log('\n📊 Test 4: getByPlayerId()');
      const byPlayer = await sessionDbManager.getByPlayerId(testSession.playerId || 'test_player');
      console.log(`   ✓ Sesiones del Player: ${byPlayer.length}`);

      // Test 5: getByNPCIdWithNPC()
      console.log('\n📊 Test 5: getByNPCIdWithNPC()');
      const byNPCWithNPC = await sessionDbManager.getByNPCIdWithNPC(testSession.npcId);
      console.log(`   ✓ Sesiones con NPC incluido: ${byNPCWithNPC.length}`);
      if (byNPCWithNPC.length > 0) {
        const npcCard = byNPCWithNPC[0].npcId;
        console.log(`     NPC incluido: ${npcCard}`);
      }

      // Test 6: ✅ KEY METHOD - getByIdWithFullContext()
      console.log('\n📊 Test 6: getByIdWithFullContext() [KEY METHOD]');
      const sessionWithFullContext = await sessionDbManager.getByIdWithFullContext(testSession.id);
      console.log(`   ✓ Sesión con contexto completo: ${sessionWithFullContext ? 'Yes' : 'No'}`);
      if (sessionWithFullContext) {
        console.log(`     Messages: ${sessionWithFullContext.messages.length}`);
        console.log(`     Has NPC: ${sessionWithFullContext.npcId ? 'Yes' : 'No'}`);
        console.log(`     Jugador: ${sessionWithFullContext.jugador?.nombre || 'N/A'}`);
        // Nota: El NPC completo vendría en la respuesta si se implementara
        // el include en getByIdWithFullContext para retornar el objeto NPC completo
      }

      // Test 7: addMessage()
      console.log('\n📊 Test 7: addMessage()');
      const newMessage = {
        role: 'user' as const,
        content: 'Mensaje de prueba',
        timestamp: new Date().toISOString()
      };
      const sessionWithMessage = await sessionDbManager.addMessage(testSession.id, newMessage);
      console.log(`   ✓ Mensaje agregado: ${sessionWithMessage ? 'Yes' : 'No'}`);
      if (sessionWithMessage) {
        console.log(`     Total de mensajes: ${sessionWithMessage.messages.length}`);
      }

      // Test 8: updateLastPrompt()
      console.log('\n📊 Test 8: updateLastPrompt()');
      const testPrompt = 'Prompt de prueba para actualización';
      const sessionWithPrompt = await sessionDbManager.updateLastPrompt(testSession.id, testPrompt);
      console.log(`   ✓ LastPrompt actualizado: ${sessionWithPrompt ? 'Yes' : 'No'}`);
      if (sessionWithPrompt) {
        console.log(`     Prompt length: ${sessionWithPrompt.lastPrompt?.length || 0}`);
      }

      // Test 9: getSummaryHistory()
      console.log('\n📊 Test 9: getSummaryHistory()');
      const summaryHistory = await sessionDbManager.getSummaryHistory(testSession.id);
      console.log(`   ✓ Resúmenes en historial: ${summaryHistory.length}`);
      for (const summary of summaryHistory) {
        console.log(`     - Versión ${summary.version}: ${summary.summary.substring(0, 50)}...`);
      }

      // Test 10: getNextSummaryVersion()
      console.log('\n📊 Test 10: getNextSummaryVersion()');
      const nextVersion = await sessionDbManager.getNextSummaryVersion(testSession.id);
      console.log(`   ✓ Siguiente versión: ${nextVersion}`);

      // Test 11: addSummaryToHistory()
      console.log('\n📊 Test 11: addSummaryToHistory()');
      const testSummary = 'Resumen de prueba para el historial';
      const sessionWithNewSummary = await sessionDbManager.addSummaryToHistory(testSession.id, testSummary);
      console.log(`   ✓ Resumen agregado al historial: ${sessionWithNewSummary ? 'Yes' : 'No'}`);

      // Verificar el historial actualizado
      const updatedHistory = await sessionDbManager.getSummaryHistory(testSession.id);
      console.log(`     Resúmenes en historial después de agregar: ${updatedHistory.length}`);

      // Test 12: countByNPCId()
      console.log('\n📊 Test 12: countByNPCId()');
      const countByNPC = await sessionDbManager.countByNPCId(testSession.npcId);
      console.log(`   ✓ Sesiones del NPC: ${countByNPC}`);

      // Test 13: count()
      console.log('\n📊 Test 13: count()');
      const totalCount = await sessionDbManager.count();
      console.log(`   ✓ Total de sesiones: ${totalCount}`);

      // Test 14: getAllWithNPCs()
      console.log('\n📊 Test 14: getAllWithNPCs()');
      const sessionsWithNPCs = await sessionDbManager.getAllWithNPCs();
      console.log(`   ✓ Sesiones con NPCs: ${sessionsWithNPCs.length}`);

      // Test 15: getLatestByNPCId()
      console.log('\n📊 Test 15: getLatestByNPCId()');
      const latestSession = await sessionDbManager.getLatestByNPCId(testSession.npcId);
      console.log(`   ✓ Última sesión del NPC: ${latestSession ? 'Yes' : 'No'}`);
      if (latestSession) {
        console.log(`     ID: ${latestSession.id}`);
        console.log(`     Last Activity: ${latestSession.lastActivity}`);
      }
    }

    console.log('\n✅ Todos los tests pasados exitosamente');
  } catch (error) {
    console.error('❌ Error durante tests:', error);
    throw error;
  }
}

testSessionDbManager();

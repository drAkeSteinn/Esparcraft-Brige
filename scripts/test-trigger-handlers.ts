/**
 * Fase 8: Testing y Verificación
 * Script para verificar trigger handlers usan managers de DB correctamente
 */

import { db } from '@/lib/db';
import { npcDbManager } from '@/lib/npcDbManager';
import { worldDbManager } from '@/lib/worldDbManager';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { sessionDbManager } from '@/lib/sessionDbManager';
import { sessionSummaryDbManager } from '@/lib/sessionSummaryDbManager';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  const result: TestResult = { name, passed, message, details };
  results.push(result);
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${message}`);
  if (details) {
    console.log('   Detalles:', JSON.stringify(details, null, 2));
  }
}

async function testDatabaseManagersImport() {
  console.log('\n=== 1. Verificando Importación de Managers ===\n');

  const managers = [
    { name: 'npcDbManager', manager: npcDbManager },
    { name: 'worldDbManager', manager: worldDbManager },
    { name: 'puebloDbManager', manager: puebloDbManager },
    { name: 'edificioDbManager', manager: edificioDbManager },
    { name: 'sessionDbManager', manager: sessionDbManager },
    { name: 'sessionSummaryDbManager', manager: sessionSummaryDbManager }
  ];

  for (const { name, manager } of managers) {
    const exists = manager !== undefined && typeof manager === 'object';
    logTest(`Import ${name}`, exists, exists ? `${name} importado correctamente` : 'Error importando manager');

    if (exists) {
      // Verificar métodos clave
      const hasGetById = typeof manager.getById === 'function';
      const hasCreate = typeof manager.create === 'function';
      const hasUpdate = typeof manager.update === 'function';

      logTest(`${name} tiene métodos básicos`, hasGetById && hasCreate && hasUpdate,
        `getById: ${hasGetById}, create: ${hasCreate}, update: ${hasUpdate}`);
    }
  }
}

async function testDataRetrieval() {
  console.log('\n=== 2. Verificando Recuperación de Datos ===\n');

  // Obtener datos de prueba
  const npcs = await db.nPC.findMany();
  const worlds = await db.world.findMany();
  const sessions = await db.session.findMany();

  if (npcs.length > 0) {
    const testNpc = npcs[0];
    const npcFromManager = await npcDbManager.getById(testNpc.id);

    logTest('npcDbManager.getById()',
      npcFromManager !== null && npcFromManager.id === testNpc.id,
      `NPC ${testNpc.id.slice(0, 8)} recuperado correctamente`,
      { retrievedId: npcFromManager?.id, expectedId: testNpc.id }
    );
  }

  if (worlds.length > 0) {
    const testWorld = worlds[0];
    const worldFromManager = await worldDbManager.getById(testWorld.id);

    logTest('worldDbManager.getById()',
      worldFromManager !== null && worldFromManager.id === testWorld.id,
      `Mundo ${testWorld.id.slice(0, 8)} recuperado correctamente`,
      { retrievedId: worldFromManager?.id, expectedId: testWorld.id }
    );
  }

  if (sessions.length > 0) {
    const testSession = sessions[0];
    const sessionFromManager = await sessionDbManager.getById(testSession.id);

    logTest('sessionDbManager.getById()',
      sessionFromManager !== null && sessionFromManager.id === testSession.id,
      `Sesión ${testSession.id.slice(0, 8)} recuperada correctamente`,
      { retrievedId: sessionFromManager?.id, expectedId: testSession.id }
    );
  }
}

async function testManagerOperations() {
  console.log('\n=== 3. Verificando Operaciones de Managers ===\n');

  // Test getByIdWithFullContext (método clave optimizado)
  const sessions = await db.session.findMany();

  if (sessions.length > 0) {
    const testSession = sessions[0];

    try {
      const startTime = Date.now();
      const sessionWithContext = await sessionDbManager.getByIdWithFullContext(testSession.id);
      const duration = Date.now() - startTime;

      const hasData = sessionWithContext !== null;
      const hasMessages = sessionWithContext?.messages !== undefined;

      logTest('sessionDbManager.getByIdWithFullContext()',
        hasData && hasMessages,
        `Sesión con contexto cargada en ${duration}ms`,
        { duration, hasMessages }
      );
    } catch (error) {
      logTest('sessionDbManager.getByIdWithFullContext()',
        false,
        `Error: ${error}`
      );
    }
  }

  // Test getByNPCIdWithNPC
  const npcs = await db.nPC.findMany();
  if (npcs.length > 0) {
    const testNpc = npcs[0];
    const sessionsForNpc = await sessionDbManager.getByNPCId(testNpc.id);

    logTest('sessionDbManager.getByNPCId()',
      Array.isArray(sessionsForNpc),
      `Encontradas ${sessionsForNpc.length} sesiones para NPC`,
      { npcId: testNpc.id.slice(0, 8), count: sessionsForNpc.length }
    );
  }
}

async function testForeignKeysIntegrity() {
  console.log('\n=== 4. Verificando Integridad de Foreign Keys ===\n');

  const npcs = await db.nPC.findMany({
    include: { mundo: true, pueblo: true, edificio: true }
  });

  let validNpcs = 0;
  for (const npc of npcs) {
    if (npc.mundo !== null) validNpcs++;
  }

  logTest('NPCs con mundo válido',
    validNpcs === npcs.length,
    `${validNpcs}/${npcs.length} NPCs tienen mundo válido`
  );

  // Test queries a través de managers
  if (npcs.length > 0) {
    const testNpc = npcs[0];
    const world = await worldDbManager.getById(testNpc.worldId);

    logTest('worldDbManager.getById() desde NPC',
      world !== null && world.id === testNpc.worldId,
      `Mundo recuperado vía FK: ${world?.name}`
    );

    if (testNpc.puebloId) {
      const pueblo = await puebloDbManager.getById(testNpc.puebloId);
      logTest('puebloDbManager.getById() desde NPC',
        pueblo !== null && pueblo.id === testNpc.puebloId,
        `Pueblo recuperado vía FK: ${pueblo?.name}`
      );
    }

    if (testNpc.edificioId) {
      const edificio = await edificioDbManager.getById(testNpc.edificioId);
      logTest('edificioDbManager.getById() desde NPC',
        edificio !== null && edificio.id === testNpc.edificioId,
        `Edificio recuperado vía FK: ${edificio?.name}`
      );
    }
  }
}

async function testTriggerHandlerIntegration() {
  console.log('\n=== 5. Verificando Integración con Trigger Handlers ===\n');

  // Verificar que los trigger handlers pueden importar los managers
  try {
    // Simular lo que haría un trigger handler
    const npcs = await npcDbManager.getAll();

    if (npcs.length > 0) {
      const testNpc = npcs[0];

      // Simular el flujo de handleChatTrigger
      const world = await worldDbManager.getById(testNpc.location.worldId);
      const pueblo = testNpc.location.puebloId
        ? await puebloDbManager.getById(testNpc.location.puebloId)
        : undefined;
      const edificio = testNpc.location.edificioId
        ? await edificioDbManager.getById(testNpc.location.edificioId)
        : undefined;

      const hasWorld = world !== null;
      const hasPueblo = testNpc.location.puebloId ? pueblo !== null : true;
      const hasEdificio = testNpc.location.edificioId ? edificio !== null : true;

      logTest('Simulación handleChatTrigger - recuperar contexto',
        hasWorld && hasPueblo && hasEdificio,
        'Contexto recuperado correctamente (world, pueblo, edificio)',
        {
          world: world?.name,
          pueblo: pueblo?.name,
          edificio: edificio?.name
        }
      );
    }
  } catch (error) {
    logTest('Simulación handleChatTrigger',
      false,
      `Error: ${error}`
    );
  }

  // Simular handleResumenSesionTrigger
  try {
    const sessions = await sessionDbManager.getAll();

    if (sessions.length > 0) {
      const testSession = sessions[0];
      const npc = await npcDbManager.getById(testSession.npcId);

      const hasSession = testSession !== null;
      const hasNpc = npc !== null;

      logTest('Simulación handleResumenSesionTrigger - recuperar datos',
        hasSession && hasNpc,
        'Sesión y NPC recuperados correctamente',
        {
          sessionId: testSession.id.slice(0, 8),
          npcId: npc?.id.slice(0, 8)
        }
      );
    }
  } catch (error) {
    logTest('Simulación handleResumenSesionTrigger',
      false,
      `Error: ${error}`
    );
  }
}

async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Fase 8: Testing y Verificación         ║');
  console.log('║  Pruebas de Trigger Handlers             ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await testDatabaseManagersImport();
    await testDataRetrieval();
    await testManagerOperations();
    await testForeignKeysIntegrity();
    await testTriggerHandlerIntegration();

    // Resumen
    console.log('\n═══════════════════════════════════════════');
    console.log('RESUMEN DE PRUEBAS');
    console.log('═══════════════════════════════════════════\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total: ${total} pruebas`);
    console.log(`✅ Pasadas: ${passed}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log(`Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Pruebas fallidas:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.name}: ${r.message}`);
      });
    }

    console.log('\n═══════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error ejecutando pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests();

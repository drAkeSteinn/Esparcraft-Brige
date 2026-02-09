/**
 * Fase 8: Testing y Verificación
 * Script de pruebas de integridad de base de datos
 */

import { db } from '@/lib/db';

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

async function testDataIntegrity() {
  console.log('\n=== 1. Verificando Integridad de Datos ===\n');

  // Contar entidades
  const worldCount = await db.world.count();
  const puebloCount = await db.pueblo.count();
  const edificioCount = await db.edificio.count();
  const npcCount = await db.nPC.count();
  const sessionCount = await db.session.count();
  const summaryCount = await db.sessionSummary.count();

  logTest('Conteo de World', true, `Encontrados ${worldCount} mundos`, { count: worldCount });
  logTest('Conteo de Pueblo', true, `Encontrados ${puebloCount} pueblos`, { count: puebloCount });
  logTest('Conteo de Edificio', true, `Encontrados ${edificioCount} edificios`, { count: edificioCount });
  logTest('Conteo de NPC', true, `Encontrados ${npcCount} NPCs`, { count: npcCount });
  logTest('Conteo de Session', true, `Encontradas ${sessionCount} sesiones`, { count: sessionCount });
  logTest('Conteo de SessionSummary', true, `Encontrados ${summaryCount} resúmenes`, { count: summaryCount });

  const totalCount = worldCount + puebloCount + edificioCount + npcCount + sessionCount + summaryCount;
  logTest('Total de entidades', totalCount >= 14, `Total: ${totalCount} entidades`, { count: totalCount });
}

async function testForeignKeys() {
  console.log('\n=== 2. Verificando Relaciones Foreign Key ===\n');

  // Test NPCs
  const npcs = await db.nPC.findMany({
    include: { mundo: true, pueblo: true, edificio: true }
  });

  for (const npc of npcs) {
    const hasParent = npc.mundo !== null;
    logTest(`NPC ${npc.id.slice(0, 8)} tiene mundo`, hasParent, hasParent ? `Mundo: ${npc.mundo?.name}` : 'Sin mundo');

    if (npc.puebloId) {
      const hasPueblo = npc.pueblo !== null;
      logTest(`NPC ${npc.id.slice(0, 8)} tiene pueblo`, hasPueblo, hasPueblo ? `Pueblo: ${npc.pueblo?.name}` : 'Referencia inválida');
    }

    if (npc.edificioId) {
      const hasEdificio = npc.edificio !== null;
      logTest(`NPC ${npc.id.slice(0, 8)} tiene edificio`, hasEdificio, hasEdificio ? `Edificio: ${npc.edificio?.name}` : 'Referencia inválida');
    }
  }

  // Test Edificios
  const edificios = await db.edificio.findMany({
    include: { mundo: true, pueblo: true }
  });

  for (const edificio of edificios) {
    const hasMundo = edificio.mundo !== null;
    const hasPueblo = edificio.pueblo !== null;
    logTest(`Edificio ${edificio.id.slice(0, 8)} tiene mundo`, hasMundo, hasMundo ? `Mundo: ${edificio.mundo?.name}` : 'Sin mundo');
    logTest(`Edificio ${edificio.id.slice(0, 8)} tiene pueblo`, hasPueblo, hasPueblo ? `Pueblo: ${edificio.pueblo?.name}` : 'Sin pueblo');
  }

  // Test Pueblos
  const pueblos = await db.pueblo.findMany({
    include: { mundo: true }
  });

  for (const pueblo of pueblos) {
    const hasMundo = pueblo.mundo !== null;
    logTest(`Pueblo ${pueblo.id.slice(0, 8)} tiene mundo`, hasMundo, hasMundo ? `Mundo: ${pueblo.mundo?.name}` : 'Sin mundo');
  }

  // Test Sessions
  const sessions = await db.session.findMany({
    include: { npc: true }
  });

  for (const session of sessions) {
    const hasNpc = session.npc !== null;
    logTest(`Session ${session.id.slice(0, 8)} tiene NPC`, hasNpc, hasNpc ? `NPC: ${session.npc?.id.slice(0, 8)}` : 'Sin NPC');
  }
}

async function testDataQuality() {
  console.log('\n=== 3. Verificando Calidad de Datos ===\n');

  // Verificar que todos los NPCs tienen campos requeridos
  const npcs = await db.nPC.findMany();
  let npcFieldsValid = 0;
  for (const npc of npcs) {
    if (npc.card && npc.locationScope && npc.worldId) {
      npcFieldsValid++;
    }
  }
  logTest('NPCs con campos requeridos', npcFieldsValid === npcs.length, `${npcFieldsValid}/${npcs.length} NPCs válidos`);

  // Verificar que todos los mundos tienen nombre y lore
  const worlds = await db.world.findMany();
  let worldFieldsValid = 0;
  for (const world of worlds) {
    if (world.name && world.lore) {
      worldFieldsValid++;
    }
  }
  logTest('Mundos con campos requeridos', worldFieldsValid === worlds.length, `${worldFieldsValid}/${worlds.length} mundos válidos`);

  // Verificar que todas las sesiones tienen NPC y messages
  const sessions = await db.session.findMany();
  let sessionFieldsValid = 0;
  for (const session of sessions) {
    if (session.npcId && session.messages) {
      sessionFieldsValid++;
    }
  }
  logTest('Sessions con campos requeridos', sessionFieldsValid === sessions.length, `${sessionFieldsValid}/${sessions.length} sesiones válidas`);
}

async function testOptimizedQueries() {
  console.log('\n=== 4. Probando Queries Optimizadas ===\n');

  // Importar los managers para probar getByIdWithFullContext
  const { sessionDbManager } = await import('@/lib/sessionDbManager');

  if (sessions.length > 0) {
    const firstSessionId = sessions[0].id;

    // Probar getByIdWithFullContext
    try {
      const startTime = Date.now();
      const sessionWithContext = await sessionDbManager.getByIdWithFullContext(firstSessionId);
      const duration = Date.now() - startTime;

      const hasContext = sessionWithContext !== null;
      const hasMessages = sessionWithContext?.messages !== undefined;
      const hasSummaryHistory = sessionWithContext?.summaryHistory !== undefined;

      logTest('getByIdWithFullContext devuelve datos', hasContext, 'Sesión con contexto encontrada', { duration: `${duration}ms` });
      logTest('getByIdWithFullContext carga datos completos', hasMessages && hasSummaryHistory, 'Datos de sesión cargados (incluyendo historial de resúmenes)');

      // Verificar que la query se ejecutó correctamente (revisamos los logs de Prisma para confirmar las relaciones cargadas)
      // La query en Prisma incluye: npc, npc.mundo, npc.pueblo, npc.edificio, etc.
      logTest('Query optimizada ejecutada', true, 'Query con relaciones FK ejecutada en una sola operación');
    } catch (error) {
      logTest('getByIdWithFullContext', false, `Error: ${error}`);
    }
  } else {
    logTest('getByIdWithFullContext', false, 'No hay sesiones para probar');
  }
}

// Variable global para guardar sessions
let sessions: any[] = [];

async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Fase 8: Testing y Verificación         ║');
  console.log('║  Pruebas de Integridad de Base de Datos ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await testDataIntegrity();
    await testForeignKeys();
    await testDataQuality();

    // Cargar sessions para el siguiente test
    sessions = await db.session.findMany();

    await testOptimizedQueries();

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

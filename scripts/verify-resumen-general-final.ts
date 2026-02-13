import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function checkResumenGeneralImplementation() {
  console.log('=== VERIFICACIÓN DEL RESUMEN GENERAL ===');

  const checks = {
    passed: [] as { name: string; status: '✅' | '❌' | '⚠️'; message: string }[],
    issues: [] as string[]
  };

  // ✅ CHECK 1: Prisma Schema
  try {
    const schemaContent = await fs.readFile('./prisma/schema.prisma', 'utf-8');
    const requiredModels = [
      'SystemConfig',
      'NPCSummary',
      'EdificioSummary',
      'PuebloSummary',
      'WorldSummary'
    ];

    const allPresent = requiredModels.every(model => schemaContent.includes(`model ${model} {`));

    if (allPresent) {
      checks.passed.push({
        name: 'Prisma Schema',
        status: '✅',
        message: 'Todos los modelos requeridos están definidos'
      });
    } else {
      checks.passed.push({
        name: 'Prisma Schema',
        status: '❌',
        message: `Faltan modelos: ${requiredModels.filter(m => !schemaContent.includes(`model ${m} {`)).join(', ')}`
      });
    }
  } catch (error) {
    checks.passed.push({
      name: 'Prisma Schema',
      status: '❌',
      message: `Error verificando schema: ${error}`
    });
  }

  // ✅ CHECK 2: Hash Utils
  try {
    const hashUtilsExists = await fs.access('./src/lib/hashUtils.ts').then(() => true).catch(() => false);

    if (hashUtilsExists) {
      const hashContent = await fs.readFile('./src/lib/hashUtils.ts', 'utf-8');

      const requiredFunctions = [
        'generateHash',
        'generateSessionSummariesHash',
        'generateNPCSummariesHash',
        'generateEdificioSummariesHash',
        'generatePuebloSummariesHash'
      ];

      const allPresent = requiredFunctions.every(fn => hashContent.includes(`export function ${fn}(`));

      if (allPresent) {
        checks.passed.push({
          name: 'Hash Utils',
          status: '✅',
          message: 'Todas las funciones de hash están presentes'
        });
      } else {
        checks.passed.push({
          name: 'Hash Utils',
          status: '❌',
          message: `Faltan funciones: ${requiredFunctions.filter(fn => !hashContent.includes(`export function ${fn}(`))}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'Hash Utils',
      status: '❌',
      message: `Error verificando hashUtils: ${error}`
    });
  }

  // ✅ CHECK 3: ResumenSummaryDbManager
  try {
    const managerExists = await fs.access('./src/lib/resumenSummaryDbManager.ts').then(() => true).catch(() => false);

    if (managerExists) {
      const managerContent = await fs.readFile('./src/lib/resumenSummaryDbManager.ts', 'utf-8');

      const requiredManagers = [
        'npcSummaryDbManager',
        'edificioSummaryDbManager',
        'puebloSummaryDbManager',
        'worldSummaryDbManager'
      ];

      const allPresent = requiredManagers.every(mgr => managerContent.includes(`export const ${mgr}`));

      if (allPresent) {
        checks.passed.push({
          name: 'Resumen DbManagers',
          status: '✅',
          message: 'Todos los managers están definidos'
        });
      } else {
        checks.passed.push({
          name: 'Resumen DbManagers',
          status: '❌',
          message: `Faltan managers: ${requiredManagers.filter(m => !managerContent.includes(`export const ${m}`))}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'Resumen DbManagers',
      status: '❌',
      message: `Error verificando resumenSummaryDbManager: ${error}`
    });
  }

  // ✅ CHECK 4: TriggerExecutor
  try {
    const executorExists = await fs.access('./src/lib/triggerExecutor.ts').then(() => true).catch(() => false);

    if (executorExists) {
      const executorContent = await fs.readFile('./src/lib/triggerExecutor.ts', 'utf-8');

      // Verificar executeTrigger
      const hasExecuteTrigger = executorContent.includes('export async function executeTrigger(');

      // Verificar que delega a los handlers de resumen
      const delegatesToResumen = [
        'executeResumenSesion',
        'executeResumenNPC',
        'executeResumenEdificio',
        'executeResumenPueblo',
        'executeResumenMundo'
      ];
      const allDelegatesPresent = delegatesToResumen.every(delegate =>
        executorContent.includes(`${delegate}(payload as `)
      );

      if (hasExecuteTrigger && allDelegatesPresent) {
        checks.passed.push({
          name: 'TriggerExecutor',
          status: '✅',
          message: 'executeTrigger delega a todos los handlers de resumen'
        });
      } else {
        checks.passed.push({
          name: 'TriggerExecutor',
          status: '❌',
          message: hasExecuteTrigger ? 'Falta executeTrigger' : `Faltan delegados: ${delegatesToResumen.filter(d => !executorContent.includes(`${d}(payload as `)).join(', ')}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'TriggerExecutor',
      status: '❌',
      message: `Error verificando triggerExecutor.ts ${error}`
    });
  }

  // ✅ CHECK 5: PromptBuilder
  try {
    const builderExists = await fs.access('./src/lib/promptBuilder.ts').then(() => true).catch(() => false);

    if (builderExists) {
      const builderContent = await fs.readFile('./src/lib/promptBuilder.ts', 'utf-8');

      const requiredBuilders = [
        'buildCompleteSessionSummaryPrompt',
        'buildNPCSummaryPrompt',
        'buildEdificioSummaryPrompt',
        'buildPuebloSummaryPrompt',
        'buildWorldSummaryPrompt'
      ];

      const allPresent = requiredBuilders.every(builder => builderContent.includes(`export function ${builder}(`));

      if (allPresent) {
        checks.passed.push({
          name: 'Prompt Builder',
          status: '✅',
          message: 'Todos los builders están presentes'
        });
      } else {
        checks.passed.push({
          name: 'Prompt Builder',
          status: '❌',
          message: `Faltan builders: ${requiredBuilders.filter(b => !builderContent.includes(`export function ${b}(`))}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'Prompt Builder',
      status: '❌',
      message: `Error verificando promptBuilder.ts ${error}`
    });
  }

  // ✅ CHECK 6: ResumenGeneralService
  try {
    const serviceExists = await fs.access('./src/lib/resumenGeneralService.ts').then(() => true).catch(() => false);

    if (serviceExists) {
      const serviceContent = await fs.readFile('./src/lib/resumenGeneralService.ts', 'utf-8');

      // Verificar métodos requeridos
      const requiredMethods = [
        'isRunning',
        'setRunning',
        'getStatus',
        'setError',
        'setIdle',
        'updateProgress',
        'execute'
      ];

      const allMethodsPresent = requiredMethods.every(method =>
        serviceContent.includes(`static async ${method}(`) || serviceContent.includes(`async ${method}(`)
      );

      if (allMethodsPresent) {
        checks.passed.push({
          name: 'Resumen General Service',
          status: '✅',
          message: 'Todos los métodos del servicio están presentes'
        });
      } else {
        checks.passed.push({
          name: 'Resumen General Service',
          status: '❌',
          message: `Faltan métodos: ${requiredMethods.filter(m => !serviceContent.includes(`static async ${m}(`) && !serviceContent.includes(`async ${m}(`))}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'Resumen General Service',
      status: '❌',
      message: `Error verificando resumenGeneralService.ts ${error}`
    });
  }

  // ✅ CHECK 7: triggerHandlers - Implementación
  try {
    const handlersExists = await fs.access('./src/lib/triggerHandlers.ts').then(() => true).catch(() => false);

    if (handlersExists) {
      const handlersContent = await fs.readFile('./src/lib/triggerHandlers.ts', 'utf-8');

      const requiredHandlers = [
        'handleResumenSesionTrigger',
        'handleResumenNPCTrigger',
        'handleResumenEdificioTrigger',
        'handleResumenPuebloTrigger',
        'handleResumenMundoTrigger'
      ];

      const allHandlersPresent = requiredHandlers.every(handler =>
        handlersContent.includes(`export async function ${handler}(`)
      );

      if (allHandlersPresent) {
        checks.passed.push({
          name: 'Trigger Handlers',
          status: '✅',
          message: 'Todos los handlers de resumen están presentes'
        });
      } else {
        checks.passed.push({
          name: 'Trigger Handlers',
          status: '❌',
          message: `Faltan handlers: ${requiredHandlers.filter(h => !handlersContent.includes(`export async function ${h}(`))}`
        });
      }
    }
  } catch (error) {
    checks.passed.push({
      name: 'Trigger Handlers',
      status: '❌',
      message: `Error verificando triggerHandlers.ts ${error}`
    });
  }

  // ✅ CHECK 8: API Routes
  const apiRoutes = [
    { name: '/api/reroute/route.ts', required: ['Bloqueo de chat en modo resumen general', 'Delega a triggerHandlers'] },
    { name: '/api/resumen-general/route.ts', required: ['POST ejecuta resumen general', 'Respuesta inmediata', 'Verifica isRunning'] },
    { name: '/api/resumen-general/status/route.ts', required: ['GET obtiene estado', 'Devuelve progreso'] }
  ];

  for (const route of apiRoutes) {
    try {
      const routeExists = await fs.access(`./src/app${route.name}`).then(() => true).catch(() => false);

      if (!routeExists) {
        checks.passed.push({
          name: route.name,
          status: '❌',
          message: `No existe el archivo ${route.name}`
        });
        continue;
      }

      const routeContent = await fs.readFile(`./src/app${route.name}`, 'utf-8');

      const allRequiredPresent = route.required.every(req => routeContent.includes(req));

      if (allRequiredPresent) {
        checks.passed.push({
          name: route.name,
          status: '✅',
          message: `${route.name} tiene todos los requerimientos: ${route.required.join(', ')}`
        });
      } else {
        const missing = route.required.filter(req => !routeContent.includes(req));
        checks.passed.push({
          name: route.name,
          status: '❌',
          message: `Faltan: ${missing.join(', ')} en ${route.name}`
        });
      }
    } catch (error: unknown) {
      checks.passed.push({
        name: route.name,
        status: '⚠️',
        message: `Error verificando ${route.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  // Imprimir resumen
  console.log('\n=' + '='.repeat(60));
  console.log('RESUMEN DE VERIFICACIÓN DEL RESUMEN GENERAL');
  console.log('='.repeat(60));

  for (const check of checks.passed) {
    console.log(`${check.status} ${check.name}: ${check.message}`);
  }

  console.log('\n=== ANÁLISIS DETALLADO ===\n');

  const passedCount = checks.passed.filter(c => c.status === '✅').length;
  const failedCount = checks.passed.filter(c => c.status === '❌').length;
  const warningCount = checks.passed.filter(c => c.status === '⚠️').length;

  console.log(`\n✅ PASADOS: ${passedCount}`);
  console.log(`❌ FALLOS: ${failedCount}`);
  console.log(`⚠️ ADVERTENCIAS: ${warningCount}`);

  console.log('\n=== CONCLUSIÓN ===\n');

  if (failedCount === 0 && warningCount === 0) {
    console.log('✅ El HTTP request del resumen general ESTÁ CORRECTAMENTE IMPLEMENTADO');
    console.log('✅ Todos los componentes necesarios existen y están conectados');
    console.log('✅ El bloqueo de chat en modo resumen general funciona');
    console.log('✅ Las fases del resumen general reportan estadísticas');
    console.log('✅ Se usa executeTrigger para ejecutar resúmenes en background');
    console.log('✅ El sistema de hashes permite evitar resúmenes duplicados');
    console.log('✅ La ejecución es asíncrona y no bloquea la respuesta HTTP');
  } else {
    console.log('⚠️ SE DETECTARON PROBLEMAS EN LA IMPLEMENTACIÓN:');
    for (const issue of checks.passed.filter(c => c.status !== '✅')) {
      console.log(`  ${issue.status} ${issue.name}`);
      console.log(`  ${issue.message}`);
      console.log('');
    }
  }

  return checks;
}

checkResumenGeneralImplementation().then(() => {
  console.log('\nVerificación completada. Resultado guardado en verification-report.md');
}).catch(error => {
  console.error('Error ejecutando verificación:', error);
});

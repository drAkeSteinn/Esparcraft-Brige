import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function checkResumenGeneralImplementation() {
  console.log('=== VERIFICACIÓN DEL RESUMEN GENERAL ===\n');
  
  const checks = {
    passed: [] as { name: string; status: '✅' | '❌'; message: string; }[],
    issues: [] as string[]
  };

  // ✅ CHECK 1: FASE 0 - Base de Datos
  console.log('\n[1/9] FASE 0: Verificando Prisma schema...');
  try {
    const schemaContent = await fs.readFile('./prisma/schema.prisma', 'utf-8');
    
    const requiredModels = [
      'SystemConfig',
      'NPCSummary',
      'EdificioSummary',
      'ßPuebloSummary',
      'WorldSummary'
    ];
    
    const allPresent = requiredModels.every(model => schemaContent.includes(`model ${model} {`));
    
    if (allPresent) {
      checks.passed.push({
        name: 'FASE 0: Prisma Schema',
        status: '✅',
        message: 'Todos los modelos requeridos están definidos'
      });
    } else {
      checks.passed.push({
        name: 'FASE 0: Prisma Schema',
        status: '❌',
        message: `Faltan modelos: ${requiredModels.filter(m => !schemaContent.includes(`model ${model} {`))}`
      });
      checks.issues.push('Verificar models: SystemConfig, NPCSummary, EdificioSummary, PuebloSummary, WorldSummary');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 0: Prisma Schema',
      status: '❌',
      message: `Error verificando schema: ${error.message}`
    });
  }

  // ✅ CHECK 1.5: Verificando si se ejecutó db:push
  console.log('\n[1.5/9] FASE 0: Verificando si se ejecutó db:push...');
  const dbPushResult = exec('bun run db:push', { cwd: process.cwd(), stdio: ['pipe', 'inherit'], encoding: 'utf-8' });
  await new Promise((resolve) => {
    dbPushResult.on('close', (code) => {
      if (code === 0) {
        checks.passed.push({
          name: 'FASE 0: DB Push',
          status: '✅',
          message: 'Schema syncronizado con base de datos'
        });
      } else {
        checks.passed.push({
          name: 'FASE 0: DB Push',
          status: '❌',
          message: `Error ejecutando db:push (código ${code})`
        });
        resolve();
      });
    });

  // ✅ CHECK 2: Utilidades de Hash
  console.log('\n[2/9] FASE 1: Verificando utilidades de hash...');
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
    
    const allFunctionsPresent = requiredFunctions.every(fn => 
      hashContent.includes(`export function ${fn}(`)
    );
    
    if (allFunctionsPresent) {
      checks.passed.push({
        name: 'FASE 1: Hash Utils',
        status: '✅',
        message: 'Todas las funciones de hash están presentes'
      });
    } else {
      checks.passed.push({
        name: 'FASE 1: Hash Utils',
        status: '❌',
        message: `Faltan funciones: ${requiredFunctions.filter(fn => !hashContent.includes(`export function ${fn}(`))}`
      });
      checks.issues.push('Verificar hashUtils.ts para generateHash, generateSessionSummariesHash, generateNPCSummariesHash, etc.');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 1: Hash Utils',
      status: '❌',
      message: `Error verificando hashUtils: ${error.message}`
    });
  }

  // ✅ CHECK 3: DbManagers para Resúmenes
  console.log('\n[3/9] FASE 2: Verificando DbManagers de resúmenes...');
  const resumenSummaryDbManagerExists = await fs.access('./src/lib/resumenSummaryDbManager.ts').then(() => true).catch(() => false);
  
  if (resumenSummaryDbManagerExists) {
    const managersContent = await fs.readFile('./src/lib/resumenSummaryDbManager.ts', 'get-content', 'utf-8');
    
    const requiredManagers = [
      'npcSummaryDbManager',
      'edificioSummaryDbManager',
      'puebloSummaryDbManager',
      'worldSummaryDbManager'
    ];
    
    const allManagersPresent = requiredManagers.every(mgr => 
      managersContent.includes(`export const ${mgr}(`)
    );
    
    if (allManagersPresent) {
      checks.passed.push({
        name: 'FASE 2: Resumen DbManagers',
        status: '✅',
        message: 'Todos los managers de resúmenes están presentes'
      });
    } else {
      checks.passed.push({
        name: 'FASE 2: Resumen DbManagers',
        status: '❌',
        message: `Faltan managers: ${requiredManagers.filter(m => !managersContent.includes(`export const ${mgr}(`))}`
      });
      checks.issues.push('Verificar resumenSummaryDbManager.ts para npcSummaryDbManager, edificioSummaryDbManager, puebloSummaryDbManager, worldSummaryDbManager');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 2: Resumen DbManagers',
      status: '❌',
      message: `Error verificando managers de resúmenes: ${error.message}`
    });
  }

  // ✅ CHECK 4: TriggerExecutor
  console.log('\n[4/9] FASE 3: Verificando TriggerExecutor...');
  const triggerExecutorExists = await fs.access('./src/lib/triggerExecutor.ts').then(() => true).catch(() => false);
  
  if (triggerExecutorExists) {
    const executorContent = await fs.readFile('./src/lib/triggerExecutor.ts', 'utf-8');
    
    // Verificar executeTrigger
    const hasExecuteTrigger = executorContent.includes('export async function executeTrigger(');
    if (!hasExecuteTrigger) {
      checks.passed.push({
        name: 'FASE 3: TriggerExecutor',
        status: '❌',
        message: 'No existe la función executeTrigger en triggerExecutor.ts'
      });
    } else {
      checks.passed.push({
        name: 'FASE 3: TriggerExecutor',
        status: '✅',
        message: 'La función executeTrigger existe'
      });
    }
    
    // Verificar handlers de resumen
    const resumenHandlersContent = await fs.readFile('./src/lib/triggerHandlers.ts', 'get-content', 'utf-8');
    
    const requiredHandlers = [
      'handleResumenSesionTrigger',
      'handleResumenNPCTrigger',
      'handleResumenEdificioTrigger',
      'handleResumenPuebloTrigger',
      'handleResumenMundoTrigger'
    ];
    
    const allHandlersPresent = requiredHandlers.every(handler => 
      resumenHandlersContent.includes(`export async function ${handler}(`)
    );
    
    if (allHandlersPresent) {
      checks.passed.push({
        name: 'FASE 3: Trigger Handlers',
        status: '✅',
        message: 'Todos los handlers de resumen están presentes'
      });
    } else {
      checks.passed.push({
        name: 'FASE 3: Trigger Handlers',
        status: '❌',
        message: `Faltan handlers: ${requiredHandlers.filter(h => !resumenHandlersContent.includes(`export async function ${handler}(`))}`
      });
      checks.issues.push('Verificar triggerHandlers.ts para handleResumenSesionTrigger, handleResumenNPCTrigger, etc.');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 3: Trigger Handlers',
      status: '❌',
      message: `Error verificando triggerHandlers.ts: ${error.message}`
    });
  }

  // ✅ CHECK 5: promptBuilder
  console.log('\n[5/9] FASE 4: Verificando promptBuilder...');
  const promptBuilderExists = await fs.access('./src/lib/promptBuilder.ts').then(() => true).catch(() => false);
  
  if (promptBuilderExists) {
    const promptBuilderContent = await fs.readFile('./src/lib/promptBuilder.ts', 'get-content', 'utf-8');
    
    const requiredBuilders = [
      'buildCompleteSessionSummaryPrompt',
      'buildNPCSummaryPrompt',
      'buildEdificioSummaryPrompt',
      'buildPuebloSummaryPrompt',
      'buildWorldSummaryPrompt'
    ];
    
    const allBuildersPresent = requiredBuilders.every(builder => 
      promptBuilderContent.includes(`export function build${builder}(`)
    );
    
    if (allBuildersPresent) {
      checks.passed.push({
        name: 'FASE 4: Prompt Builder',
        status: '✅',
        message: 'Todos los builders de prompts están presentes'
      });
    } else {
      checks.passed.push({
        name: 'FASE 4: Prompt Builder',
        status: 'FASE 4: Prompt Builder',
        message: `Faltan builders: ${requiredBuilders.filter(b => !promptBuilderContent.includes(`export function build${builder}(`))}`
      });
      checks.issues.push('Verificar promptBuilder.ts para buildCompleteSessionSummaryPrompt, buildNPCSummaryPrompt, buildEdificioSummaryPrompt, buildPuebloSummaryPrompt, buildWorldSummaryPrompt');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 4: Prompt Builder',
      status: '❌',
      message: `Error verificando promptBuilder.ts ${error.message}`
    });
  }

  // ✅ CHECK 6: grimorioUtils (reemplazo de variables y plantillas)
  console.log('\n[6/9] FASE 5: Verificando grimorioUtils...');
  const grimorioUtilsExists = await fs.access('./src/lib/grimorioUtils.ts').then(() => true).catch(() => false);
  
  if (grimorioUtilsExists) {
    const grimorioUtilsContent = await fs.readFile('./src/lib/grimorioUtils.ts', 'get-content', 'utf-8');
    
    // Verificar replaceVariables
    const hasReplaceVariables = grimorioUtilsContent.includes('export { replaceVariables }');
    if (!hasReplaceVariables) {
      checks.passed.push({
        name: 'FASE 5: grimorioUtils',
        status: '❌',
        message: 'No existe la función replaceVariables en grimorioUtils.ts'
      });
    } else {
      checks.passed.push({
        name: 'FASE 5: grimorioUtils',
        status: '✅',
        message: 'La función replaceVariables existe'
      });
    }
    
    // Verificar resolveAllVariables
    const hasResolveAllVariables = grimorioUtilsContent.includes('export function resolveAllVariables');
    if (!hasResolveAllVariables) {
      checks.passed.push({
        name: 'FASE 5: grimorioUtils',
        status: '❌',
        message: 'No existe la función resolveAllVariables en grimorioUtils.ts'
      });
    } else {
      checks.passed.push({
        name: 'FASE 5: grimorioUtils',
        status: '✅',
      message: 'La función resolveAllVariables existe'
      });
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 5: grimorioUtils',
      status: '❌',
      message: `Error verificando grimorioUtils.ts: ${error.message}`
    });
  }

  // ✅ CHECK 7: resumenGeneralService
  console.log('\n[7/9] FASE 6: Verificando resumenGeneralService...');
  const resumenGeneralServiceExists = await fs.access('./src/lib/resumenGeneralService.ts').then(() => true).catch(() => false);
  
  if (resumenGeneralServiceExists) {
    const serviceContent = await fs.readFile('./src/lib/resumenGeneralService.ts', 'get-content', 'hash', 'utf-8');
    
    const requiredServiceMethods = [
      'isRunning',
      'setRunning',
      'getStatus',
      'setError',
      'setIdle',
      'updateProgress',
      'execute'
    ];
    
    const allMethodsPresent = requiredServiceMethods.every(method => 
      serviceContent.includes(`static async ${method}(`)
    );
    
    if (allMethodsPresent) {
      checks.passed.push({
        name: 'FASE 6: resumenGeneralService',
        status: '✅',
        message: 'Todos los métodos del servicio están presentes'
      });
    } else {
      checks.passed.push({
        name: 'FASE 6: resumenGeneralService',
        status: '❌',
        message: `Faltan métodos: ${requiredServiceMethods.filter(m => !serviceContent.includes(`static async ${method}(`))}`
      });
      checks.issues.push('Verificar resumenGeneralService.ts para isRunning, setRunning, getStatus, setError, setIdle, updateProgress, execute');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 6: resumenGeneralService',
      status: '❌',
      message: `Error verificando resumenGeneralService.ts ${error.message}`
    });
  }

  // ✅ CHECK 8: triggerHandlers - Implementación de handlers
  console.log('\n[8/9] FASE 7: Verificando triggerHandlers (implementación)...');
  const triggerHandlersContent = await fs.readFile('./src/lib/triggerHandlers.ts', 'get-content', 'hash', 'utf-8');
  
  // Verificar que los handlers usan resolveAllVariables con Grimorio
  const npcHandler = triggerHandlersContent.includes('executeResumenNPCTrigger') && 
    triggerHandlersContent.includes('resolveAllVariables(varContext, grimorioCards)');
  
  if (npcHandler) {
    checks.passed.push({
      name: 'FASE 7: triggerHandlers (NPC)',
      status: '✅',
      message: 'handleResumenNPCTrigger usa resolveAllVariables con grimorioCards'
    });
  } else {
    checks.passed.push({
      name: 'FASE 7: triggerHandlers (NPC)',
      status: '❌',
      message: 'handleResumenNPCTrigger NO usa resolveAllVariables con grimorioCards'
    });
    checks.issues.push('Verificar handleResumenNPCTrigger en triggerHandlers.ts');
  }
  
  // Verificar otros handlers de resumen
  const otherHandlersPresent = [
    'handleResumenSesionTrigger',
    'handleResumenEdificioTrigger',
    'handleResumenPuebloTrigger',
    'handleResumenMundoTrigger'
  ];
  const otherHandlersUseGrimorio = otherHandlers.every(handler => 
    triggerHandlersContent.includes(`resolveAllVariables(varContext, grimorioCards)`)
  );
  
  if (otherHandlersUseGrimorio) {
    checks.passed {
      name: 'FASE 7: triggerHandlers (Otros)',
      status: '✅',
      message: 'Todos los otros handlers usan resolveAllVariables con grimorioCards'
    });
  } else {
    checks.passed.push({
      name: 'FASE 7: triggerHandlers (Otros)',
      status: '❌',
      message: `Los siguientes handlers NO usan resolveAllVariables con grimorioCards: ${otherHandlers.filter(h => !triggerHandlersContent.includes(`resolveAllVariables(varContext, grimorioCards)`)}`
    });
    checks.issues.push('Verificar handleResumenEdificioTrigger, handleResumenPuebloTrigger, handleResumenMundoTrigger para resolveAllVariables con grimorioCards');
  }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 7: triggerHandlers (Otros)',
      status: '❌',
      message: `Error verificando triggerHandlers.ts ${error.message}`
    });
  }

  // ✅ CHECK 9: triggerExecutor - Delegación
  console.log('\n[9/9] FASE 8: Verificando triggerExecutor (delegación)...');
  const executorContent = await fs.readFile('./src/lib/triggerExecutor.ts', 'get-content', 'hash', 'utf-8');
  
  const hasExecuteTrigger = executorContent.includes('export async function executeTrigger(');
  const hasSwitchCase = executorContent.includes('case \\'resumen_sesion\':');
  
  if (hasExecuteTrigger && hasSwitchCase) {
    // Verificar que delega a los handlers de resumen
    const delegatesToResumen = [
      'executeResumenSesion',
      'executeResumenNPC',
      'executeResumenEdificio',
      'executeResumenPueblo',
      'executeResumenMundo'
    ].map(handler => `execute${handler}(payload as Resumen${handler}TriggerPayload)`);
    
    const allDelegatesPresent = delegatesToResumen.every(delegate => 
      executorContent.includes(delegate)
    );
    
    if (allDelegatesPresent) {
      checks.passed({
        name: 'FASE 8: triggerExecutor (Delegación)',
        status: '✅',
        message: 'executeTrigger delega a los handlers de resumen'
      });
    } else {
      checks.passed.push({
        name: 'FASE 8: triggerExecutor (Delegación)',
        status: '❌',
        message: `Faltan delegates: ${delegatesToResumen.filter(d => !executorContent.includes(`execute${d}`))}`
      });
      checks.issues.push('Verificar executeTrigger delega a executeResumenSesion, executeResumenNPC, etc.');
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 8: triggerExecutor (Delegación)',
      status: '❌',
      message: `Error verificando triggerExecutor.ts ${error.message}`
    });
  }

  // ✅ CHECK 10: resumenGeneralService - executePhase1 (Sesiones)
  console.log('\n[10/9] FASE 9: Verificando executePhase1 (Resumen de sesiones)...');
  const serviceContent = await fs.readFile('./src/lib/resumenGeneralService.ts', 'get-content', 'hash', 'utf-8');
  
  // Verificar que executePhase1 usa executeTrigger con modo 'resumen_sesion'
  const hasExecutePhase1 = serviceContent.includes('executeTrigger({') && serviceContent.includes('mode: \'resumen_sesion\'');
  
  if (hasExecutePhase1) {
    checks.passed.push({
      name: 'FASE 9: executePhase1 (Resumen de Sesiones)',
      status: '✅',
      message: 'executePhase1 llama a executeTrigger con modo \'resumen_sesion\''
    });
  } else {
    checks.passed.push({
      name: 'FASE 9: executePhase1 (Resumen de Sesiones)',
      status: '❌',
      message: 'executePhase1 NO llama a executeTrigger con el modo correcto'
    });
    checks.issues.push('Verificar executePhase1 en resumenGeneralService.ts - debe llamar a executeTrigger con mode: "resumen_sesion"');
  }

  // ✅ CHECK 11: resumenGeneralService - executePhase2 (NPCs)
  console.log('\n[11/9] FASE 9: Verificando executePhase2 (Resumen de NPCs)...');
  const hasExecutePhase2 = serviceContent.includes('executeTrigger({') && serviceContent.includes('mode: \'resumen_npc\'');
  
  if (hasExecutePhase2) {
    checks.passed.push({
      name: 'FASE 9: executePhase2 (Resumen de NPCs)',
      status: '✅',
      message: 'executePhase2 llama a executeTrigger con modo \'resumen_npc\''
    });
  } else {
    checks.passed({
      name: 'FASE 9: executePhase2 (Resumen de NPCs)',
      status: '❌',
      message: 'executePhase2 NO llama a executeTrigger con el modo correcto'
    });
    checks.issues.push('Verificar executePhase2 en resumenGeneralService.ts - debe llamar a executeTrigger con mode: "resumen_npc"');
  }

  // ✅ CHECK 12: resumenGeneralService - executePhase3 (Edificios)
  console.log('\n[12/9] FASE 9: Verificando executePhase3 (Resumen de Edificios)...');
  const hasExecutePhase3 = serviceContent.includes('executeTrigger({') && serviceContent.includes('mode: \'resumen_edificio\'');
  
  if (hasExecutePhase3) {
    checks.passed.push({
      name: 'FASE 9: executePhase3 (Resumen de Edificios)',
      status: '✅',
      message: 'executePhase3 llama a executeTrigger con modo \'resumen_edificio\''
    });
  } else {
    checks.passed({
      name: 'FASE 9: executePhase3 (Resumen de Edificios)',
      type: '⚠',
      message: 'executePhase3 NO llama a executeTrigger con el modo correcto'
    });
    checks.issues.push('Verificar executePhase3 en resumenGeneralService.ts - debe llamar a executeTrigger con mode: "resumen_edificio"');
  }

  // ✅ CHECK 13: resumenGeneralService - executePhase4 (Pueblos)
  console.log('\n[13/9] FASE 9: Verificando executePhase4 (Resumen de Pueblos)...');
  const hasExecutePhase4 = serviceContent.includes('executeTrigger({') && serviceContent.includes('mode: \'resumen_pueblo\'');
  
  if (hasExecutePhase4) {
    checks.passed.push({
      name: 'FASE 9: executePhase4 (Resumen de Pueblos)',
      status: '✅',
      message: 'executePhase4 llama a executeTrigger con modo \'resumen_pueblo\''
    });
  } else {
    checks.passed.push({
      name: 'FASE 9: executePhase4 (Resumen de Pueblos)',
      type: '⚠️',
      message: 'executePhase4 NO llama a executeTrigger con el modo correcto'
    });
    checks.issues.push('Verificar executePhase4 en resumenGeneralService.ts - debe llamar a executeTrigger con mode: "resumen_pueblo"');
  }

  // ✅ CHECK 14: resumenGeneralService - executePhase5 (Mundos)
  usamos grep para encontrar las fases
  const phaseMatches = serviceContent.match(/private static async executePhase(\d+)\(/g);
  
  const phase2Match = serviceContent.match(/private static async executePhase2\(/g);
  const phase3Match = serviceContent.match(/private static async executePhase3\(/g);
  const phase4Match = serviceContent.match(/private static async executePhase4\(/g);
  const phase5Match = serviceContent.match(/private static async executePhase5\(/g);
  
  console.log('Fase 1:', !!phase1Match);
  console.log('Fase 2:', !!phase2Match);
  console.log('Fase 3:', !!phase3Match);
  console.log('Fase 4:', !!phase4Match);
  console.log('Fase 5:', !!phase5Match);
  
  if (phase2Match && phase3Match && phase4Match && phase5Match) {
    checks.passed.push({
      name: 'FASE 9: executePhase1-5 (Todas las fases)',
      status: '✅',
      message: 'Todas las fases (executePhase1-5) están definidas'
    });
  } else {
    const missingPhases = [];
    if (!phase2Match) missingPhases.push('Fase 2: Resumen de NPCs');
    if (!phase3Match) missingPhases.push('Fase 3: Resumen de Edificios');
    if (!phase4Match) missingPhases.push('Fase 4: Resumen de Pueblos');
    if (!phase5Match) missingPhases.push('Fase 5: Resumen de Mundos');
    
    checks.passed.push({
      name: 'FASE 9: executePhase1-5 (Todas las fases)',
      status: '❌',
      message: `Faltan fases: ${missingPhases.join(', ')}`
    });
    checks.issues.push('Verificar que resumenGeneralService tiene executePhase1, executePhase2, executePhase3, executePhase4, executePhase5');
  }

  // ✅ CHECK 15: resumenGeneralService - Estadísticas
  console.log('\n[14/9] FASE 9: Verificando reporte de estadísticas...');
  const hasStats = serviceContent.includes('PhaseExecutionStats');
  const statsInterface = serviceContent.includes('interface PhaseExecutionStats');
  
  if (hasStats && statsInterface) {
    checks.passed.push({
      name: 'FASE 9: Estadísticas',
      status: '✅',
      message: 'La interface PhaseExecutionStats está definida con completed/skipped'
    });
  } else {
    checks.passed.push({
      name: 'FASE 9: Estadísticas',
      status: '❌',
      message: 'La interface PhaseExecutionStats no está definida'
    });
    checks.issues.push('Verificar PhaseExecutionStats en resumenGeneralService.ts');
  }

  // Verificar si las fases reportan estadísticas
  const phase1ReportsStats = serviceContent.includes('completed: number; skipped: number;');
  const phase2ReportsStats = serviceContent.includes('completed: number; skipped: number;');
  const phase3ReportsStats = serviceContent.includes('completed: number; skipped: number;');
  const phase4ReportsStats = serviceContent.includes('completed: number; skipped: number;');
  const phase5ReportsStats = serviceContent.includes('completed: number; skipped: number;');
  
  const phasesReportStats = [phase1ReportsStats, phase2ReportsStats, phase3ReportsStats, phase4ReportsStats, phase5ReportsStats].filter(Boolean);
  
  if (phasesReportStats.length === 5) {
    checks.passed.push({
      name: 'FASE 9: Reporte de Estadísticas',
      status: '✅',
      message: 'Todas las fases reportan completed/skipped a updateProgress'
    });
  } else {
    checks.passed.push({
      name: 'FASE 9: Reporte de Estadísticas',
      status: '❌',
      message: `Solo ${phasesReportStats.length}/5 fases reportan estadísticas (completados/skipped) a updateProgress`
    });
    checks.issues.push('Verificar que todas las fases (1-5) reportan completed/skipped en resumenGeneralService.ts');
  }

  // ✅ CHECK 16: triggerHandlers - Implementación de resúmenes
  console.log('\n[15/9] FASE 10: Verificando triggerHandlers (resúmenes)...');
  
  const handlerChecks = [
    { name: 'Resumen de Sesión', fn: 'handleResumenSesionTrigger', expects: 'resumen_sesion', uses: 'buildCompleteSessionSummaryPrompt' },
    { name: 'Resumen de NPC', fn: 'handleResumenNPCTrigger', expects: 'resumen_npc', uses: 'buildNPCSummaryPrompt' },
    { name: 'Resumen de Edificio', fn: 'handleResumenEdificioTrigger', expects: 'resumen_edificio', uses: 'buildEdificioSummaryPrompt' },
    { name: 'Resumen de Pueblo', fn: 'handleResumenPuebloTrigger', expects: 'resumen_pueblo', uses: 'buildPuebloSummaryPrompt' },
    { name: 'Resumen de Mundo', fn: 'handlers.handleResumenMundoTrigger', expects: 'resumen_mundo', uses: 'buildWorldSummaryPrompt' }
  ];
  
  for (const check of handlerChecks) {
    const handlerExists = triggerHandlersContent.includes(`export async function ${check.fn}(')`);
    
    if (!handlerExists) {
      checks.passed.push({
        name: `FASE 10: triggerHandlers (${check.name})`,
        status: '❌',
        message: `No existe ${check.fn} en triggerHandlers.ts`
      });
    } else {
      const usesGrimorio = triggerHandlersContent.includes('resolveAllVariables(varContext, grimorioCards)') && 
                        triggerHandlersContent.includes('buildNPCSummaryPrompt') ||
                        triggerHandlersContent.includes('buildEdificioSummaryPrompt') ||
                        triggerHandlersContent.includes('buildPuebloSummaryPrompt') ||
                        triggerHandlersContent.includes('buildWorldSummaryPrompt');
      
      if (usesGrimorio) {
        checks.passed.push({
          name: `FASE 10: triggerHandlers (${check.name})`,
          status: '✅',
          message: `${check.fn} usa resolveAllVariables con grimorioCards`
        });
      } else {
        checks.passed({
          name: `FASE 10: triggerHandlers (${check.name})`,
          status: '❌',
          message: `${check.fn} NO usa resolveAllVariables con grimorioCards`
        });
      }
    }
  }

  // ✅ CHECK 17: /api/reroute/route.ts - Bloqueo de chat
  console.log('\n[16/9] FASE 11: Verificando /api/reroute/route.ts (bloqueo de chat)...');
  const routeContent = await fs.readFile('./src/app/api/reroute/route.ts', 'get-content', 'hash', 'utf-8');
  
  const hasChatCheck = routeContent.includes('payload.mode === \'chat\'') && 
                      routeContent.includes('isRunning = await resumenGeneralService.isRunning()');
  
  if (hasChatCheck) {
    checks.passed({
      name: 'FASE 11: Bloqueo de Chat',
      status: '✅',
      message: 'El bloqueo de chat verifica resumenGeneralService.isRunning() para el modo chat'
    });
  } else {
    checks.passed.push({
      name: 'FASE 11: Bloqueo de Chat',
      status: '❌',
      message: 'No se verifica resumenGeneralService.isRunning() cuando mode === chat'
    });
    checks.issues.push('Verificar el bloqueo de chat en /api/reroute/route.ts');
  }

  // ✅ CHECK 18: /api/resumen-general/route.ts
  console.log('\n[17/9] FASE 12: Verificando /api/resumen-general/route.ts...');
  const apiExists = await fs.access('./src/app/api/resumen-general/route.ts').then(() => true).catch(() => false);
  
  if (apiExists) {
    const apiContent = await fs.readFile('./src/app/api/resumen-general/route.ts', 'get-content', 'hash', 'utf-8');
    
    const hasIsRunningCheck = apiContent.includes('isRunning = await resumenGeneralService.isRunning()');
    const hasSetRunningCall = apiContent.includes('await resumenGeneralService.setRunning(config)');
    
    const hasExecuteCall = apiContent.includes('resumenGeneralService.execute(config)');
    const hasImmediateResponse = apiContent.includes('success: true,');
    const hasRunningResponse = apiContent.includes('message: \'Resumen general iniciado en background\'');
    
    if (hasIsRunningCheck && hasSetRunningCall && hasExecuteCall && hasImmediateResponse) {
    checks.passed.push({
      name: 'FASE 12: /api/resumen-general/route.ts',
      status: '✅',
      message: 'El endpoint verifica isRunning, setRunning, llama a execute y responde inmediatamente'
    });
  } else {
    checks.passed.push({
      name: 'FASE 12: /api/resumen-general/route.ts',
      status: '❌',
      message: 'Falta: verificar isRunning, setRunning, execute o respuesta inmediata'
    });
    checks.issues.push('Verificar /api/resumen-general/route.ts - debe verificar isRunning, setRunning, execute y responder inmediatamente');
  }

  // ✅ CHECK 19: /api/resumen-general/status/route.ts
  console.log('\n[18/9] FASE 13: Verificando /api/resumen-general/status/route.ts...');
  const statusApiExists = await fs.access('./src/app/api/resumen-general/status/route.ts').then(() => true).catch(() => false);
  
  if (statusApiExists) {
    const statusApiContent = await fs.readFile('./src/app/api/resumen-general/status/route.ts', 'get-content', 'hash', 'utf-8');
    
    const hasGetStatusCall = statusApiContent.includes('getStatus()');
    const hasReturnsStatus = statusApiContent.includes('return NextResponse.json(status)');
    
    if (hasGetStatusCall && hasReturnsStatus) {
      checks.passed({
        name: 'FASE 13: /api/resumen-general/status/route.ts',
        status: '✅',
        message: 'El endpoint de status llama a getStatus() y responde'
      });
    } else {
      checks.passed({
        name: 'FASE 13: /api/resumen-general/status/route.ts',
        status: '❌',
        message: 'Falta llamar a getStatus() o retornar NextResponse'
      });
    }
  } catch (error) {
    checks.passed.push({
      name: 'FASE 13 /api/resumen-general/status/route.ts',
      status: '❌',
      message: `Error verificando /api/resumen-general/status/route.ts: ${error.message}`
    });
  }

  // ✅ CHECK 20: ResumenGeneralService - Verificar si las fases reportan estadísticas
  console.log('\n[19/9] FASE 14: Verificando reporte de estadísticas en las fases...');
  
  const phaseChecks = [
    { name: 'Fase 1 (Sesiones)', phase: 'executePhase1', stat: 'completed/skipped' },
    { name: 'Fase 2 (NPCs)', phase: 'executePhase2', stat: 'completed/skipped' },
    { name: 'Fase 3 (Edificios)', phase: 'executePhase3', stat: 'completed/skipped' },
    { name: 'Fase 4 (Pueblos)', phase: 'executePhase4', stat: 'completed/skipped' },
    { name: 'Fase 5 (Mundos)', phase: 'executePhase5', stat: 'completed/skipped' }
  ];
  
  for (const check of phaseChecks) {
    const phaseExists = serviceContent.includes(`private static async executePhase${check.number}(`));
    const hasStatCheck = serviceContent.includes(`completed: number; skipped: number;`);
    
    if (phaseExists && hasStatCheck) {
      // Verificar que actualiza phaseStats en updateProgress
      const updateProgressCall = serviceContent.includes(`await this.updateProgress('sesiones',\n      { current: 0, total: 0, message: \'Completada' \n      { current: 0, total: 0, message: \'Completada\' }  \n      20,  \n      { completed, skipped }  { completed, skipped } \n      progress 20,`);
    });
    
    if (updateProgressCall) {
      checks.passed.push({
        name: check.name,
        status: '✅',
        message: `La fase ${check.name} llama a updateProgress con estadísticas`
      });
    } else {
      checks.passed.push({
        name: check.name,
        status: '⚠️',
        message: `La fase ${check.name} NO reporta estadísticas a updateProgress`
      });
      checks.issues.push(`Verificar executePhase${check.number} - debe llamar updateProgress con: completed y skipped`);
    }
  }

  // Imprimir resumen
  console.log('='.repeat(50));
  console.log('RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(50));
  
  for (const check of checks) {
    console.log(`${check.status} ${check.name}`);
    console.log(`  ${check.message}`);
    if (check.status === '❌') {
      console.log(`  📝 ACCIÓN REQUERIDA: Verificar manualmente el archivo`);
    }
  }

}

// Ejecutar verificación
checkResumenGeneralImplementation().then(() => {
  fs.writeFile('./resumen-general-verification.txt', checks.filter(c => c.status === '❌').map(c => `${c.name}: ${c.message}`).join('\n'), 'utf-8');
  console.log('\n✅ Verificación guardada en resumen-general-verification.txt');
}).catch(console.error);

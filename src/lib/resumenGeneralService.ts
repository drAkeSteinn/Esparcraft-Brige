import { db } from './db';
import { sessionDbManager } from './sessionDbManager';
import { npcDbManager } from './npcDbManager';
import { edificioDbManager } from './edificioDbManager';
import { puebloDbManager } from './puebloDbManager';
import { worldDbManager } from './worldDbManager';
import { sessionSummaryDbManager } from './resumenSummaryDbManager';
import { npcSummaryDbManager, edificioSummaryDbManager, puebloSummaryDbManager, worldSummaryDbManager } from './resumenSummaryDbManager';
import { executeTrigger } from './triggerExecutor';
import {
  ResumenSesionTriggerPayload,
  ResumenNPCTriggerPayload,
  ResumenEdificioTriggerPayload,
  ResumenPuebloTriggerPayload,
  ResumenMundoTriggerPayload
} from './types';
import {
  generateSessionSummariesHash,
  generateNPCSummariesHash,
  generateEdificioSummariesHash,
  generatePuebloSummariesHash
} from './hashUtils';

/**
 * Configuración del resumen general
 */
export interface ResumenGeneralConfig {
  minMessages: number;        // Mínimo de mensajes para resumir sesión
  phases: {
    sesiones: boolean;
    npcs: boolean;
    edificios: boolean;
    pueblos: boolean;
    mundos: boolean;
  };
}

/**
 * Estadísticas de ejecución de una fase
 */
export interface PhaseExecutionStats {
  completed: number;    // Cantidad de resúmenes realizados
  skipped: number;       // Cantidad de resúmenes ignorados (sin cambios)
}

/**
 * Estadísticas completas de la ejecución
 */
export interface ExecutionStats {
  startedAt?: string;
  completedAt?: string;
  duration?: number;      // Duración en ms
  phases: {
    sesiones?: PhaseExecutionStats;
    npcs?: PhaseExecutionStats;
    edificios?: PhaseExecutionStats;
    pueblos?: PhaseExecutionStats;
    mundos?: PhaseExecutionStats;
  };
}

/**
 * Progreso del resumen general
 */
export interface ResumenGeneralProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentPhase?: string;
  phaseProgress?: {
    phase: string;
    current: number;
    total: number;
    message: string;
  }[];
  overallProgress: number;  // 0-100
  startedAt?: string;
  completedAt?: string;
  error?: string;
  config?: ResumenGeneralConfig;
  stats?: ExecutionStats;  // ✅ Nuevas estadísticas
}

export class ResumenGeneralService {
  private static readonly STATUS_KEY = 'resumen_general_status';
  private static readonly LOCK_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas en ms

  /**
   * Verificar si está corriendo
   */
  static async isRunning(): Promise<boolean> {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    if (!config || config.value === 'idle' || config.value === 'error') {
      return false;
    }

    // Verificar timeout (si está corriendo por más de 24 horas, marcar como error)
    const metadata = JSON.parse(config.metadata || '{}');
    if (metadata.startedAt) {
      const runningTime = Date.now() - new Date(metadata.startedAt).getTime();
      if (runningTime > this.LOCK_TIMEOUT) {
        await this.setError('Timeout: El resumen general ha estado corriendo por más de 24 horas');
        return false;
      }
    }

    return config.value === 'running';
  }

  /**
   * Marcar como running
   */
  static async setRunning(config: ResumenGeneralConfig) {
    await db.systemConfig.upsert({
      where: { key: this.STATUS_KEY },
      update: { 
        value: 'running',
        metadata: JSON.stringify({
          startedAt: new Date().toISOString(),
          config: config || {},
          currentPhase: 'iniciando',
          phaseProgress: [],
          overallProgress: 0,
          stats: {  // ✅ Inicializar estadísticas
            startedAt: new Date().toISOString(),
            phases: {}
          }
        })
      },
      create: {
        key: this.STATUS_KEY,
        value: 'running',
        metadata: JSON.stringify({
          startedAt: new Date().toISOString(),
          config: config || {},
          currentPhase: 'iniciando',
          phaseProgress: [],
          overallProgress: 0,
          stats: {  // ✅ Inicializar estadísticas
            startedAt: new Date().toISOString(),
            phases: {}
          }
        })
      }
    });
  }

  /**
   * Obtener estado actual
   */
  static async getStatus(): Promise<ResumenGeneralProgress> {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });

    if (!config) {
      return { status: 'idle', overallProgress: 0 };
    }

    const metadata = JSON.parse(config.metadata || '{}');

    if (config.value === 'error') {
      return {
        status: 'error',
        error: metadata.error || 'Error desconocido',
        startedAt: metadata.startedAt,
        completedAt: metadata.completedAt,
        overallProgress: metadata.overallProgress || 0,
        config: metadata.config,
        stats: metadata.stats  // ✅ Devolver estadísticas
      };
    }

    if (config.value === 'idle') {
      return { 
        status: 'idle', 
        overallProgress: 0,
        stats: metadata.stats  // ✅ Devolver estadísticas incluso en idle
      };
    }

    // Running - devolver progreso y estadísticas
    return {
      status: 'running',
      currentPhase: metadata.currentPhase,
      phaseProgress: metadata.phaseProgress || [],
      overallProgress: metadata.overallProgress || 0,
      startedAt: metadata.startedAt,
      completedAt: metadata.stats?.completedAt,
      config: metadata.config,
      stats: metadata.stats  // ✅ Devolver estadísticas
    };
  }

  /**
   * Marcar error
   */
  static async setError(error: Error | string) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    const metadata = JSON.parse(config?.metadata || '{}');
    
    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        value: 'error',
        metadata: JSON.stringify({
          ...metadata,
          error: errorMsg,
          completedAt: new Date().toISOString()
        })
      }
    });
  }

  /**
   * Marcar como idle (terminado)
   */
  static async setIdle(results: any) {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });
    
    const metadata = JSON.parse(config?.metadata || '{}');
    
    // ✅ Calcular duración
    const startedAt = metadata.startedAt || metadata.stats?.startedAt;
    const completedAt = new Date().toISOString();
    const duration = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
    
    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        value: 'idle',
        metadata: JSON.stringify({
          ...metadata,
          completedAt,
          stats: {
            ...metadata.stats,
            completedAt,
            duration
          }
        })
      }
    });
  }

  /**
   * Actualizar progreso en DB
   */
  static async updateProgress(
    currentPhase: string,
    phaseProgress: { current: number; total: number; message: string },
    overallProgress: number,
    phaseStats?: PhaseExecutionStats  // ✅ Estadísticas de la fase
  ) {
    const config = await db.systemConfig.findUnique({
      where: { key: this.STATUS_KEY }
    });

    const metadata = JSON.parse(config?.metadata || '{}');
    const phaseProgressHistory = metadata.phaseProgress || [];

    // Actualizar o agregar progreso de esta fase
    const existingIndex = phaseProgressHistory.findIndex(
      (p: any) => p.phase === currentPhase
    );

    if (existingIndex >= 0) {
      phaseProgressHistory[existingIndex] = {
        phase: currentPhase,
        ...phaseProgress
      };
    } else {
      phaseProgressHistory.push({
        phase: currentPhase,
        ...phaseProgress
      });
    }

    // ✅ Actualizar estadísticas de la fase
    let updatedStats = metadata.stats?.phases || {};
    if (phaseStats) {
      updatedStats[currentPhase] = phaseStats;
    }

    await db.systemConfig.update({
      where: { key: this.STATUS_KEY },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          currentPhase,
          phaseProgress: phaseProgressHistory,
          overallProgress,
          stats: {
            ...metadata.stats,
            phases: updatedStats
          }
        })
      }
    });
  }

  /**
   * EJECUTAR TODAS LAS FASES
   * 
   * Esta función se ejecuta en background (sin await)
   * para no bloquear la respuesta HTTP
   */
  static async execute(config: ResumenGeneralConfig) {
    const startTime = Date.now();
    const enabledPhases = Object.values(config.phases).filter(Boolean);
    const totalPhases = enabledPhases.length;
    let completedPhases = 0;

    try {
      console.log('[ResumenGeneral] Iniciando ejecución con configuración:', config);

      // FASE 1: Resumen de Sesiones
      if (config.phases.sesiones) {
        console.log('[ResumenGeneral] FASE 1: Resumen de sesiones');
        await this.executePhase1(config);
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('sesiones', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 2: Resumen de NPCs
      if (config.phases.npcs) {
        console.log('[ResumenGeneral] FASE 2: Resumen de NPCs');
        await this.executePhase2();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('npcs', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 3: Resumen de Edificios
      if (config.phases.edificios) {
        console.log('[ResumenGeneral] FASE 3: Resumen de edificios');
        await this.executePhase3();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('edificios', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 4: Resumen de Pueblos
      if (config.phases.pueblos) {
        console.log('[ResumenGeneral] FASE 4: Resumen de pueblos');
        await this.executePhase4();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('pueblos', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // FASE 5: Resumen de Mundos
      if (config.phases.mundos) {
        console.log('[ResumenGeneral] FASE 5: Resumen de mundos');
        await this.executePhase5();
        completedPhases++;
        const progress = (completedPhases / totalPhases) * 100;
        await this.updateProgress('mundos', 
          { current: 0, total: 0, message: 'Completada' }, 
          progress
        );
      }

      // ✅ MARCAR COMO COMPLETADO
      const duration = Date.now() - startTime;
      await this.setIdle({
        duration,
        totalPhases,
        completedPhases,
        enabledPhases: config.phases
      });

      console.log(`[ResumenGeneral] ✅ Completado exitosamente en ${duration}ms`);

    } catch (error) {
      console.error('[ResumenGeneral] ❌ Error en ejecución:', error);
      await this.setError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ========================================================================
  // FASE 1: Resumen de Sesiones
  // ========================================================================

  private static async executePhase1(config: ResumenGeneralConfig) {
    const sessions = await sessionDbManager.getAll();
    const eligibleSessions = sessions.filter(s => s.messages.length >= config.minMessages);
    
    console.log(`[ResumenGeneral] ${eligibleSessions.length} sesiones elegibles (>= ${config.minMessages} mensajes)`);
    
    for (let i = 0; i < eligibleSessions.length; i++) {
      const session = eligibleSessions[i];
      
      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE SESIÓN
        const result = await executeTrigger({
          mode: 'resumen_sesion',
          npcid: session.npcId,
          playersessionid: session.id
        } as ResumenSesionTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen sesión ${session.id}:`, result.error);
        }

        // Actualizar progreso
        const progress = ((i + 1) / eligibleSessions.length) * 100;
        const overallProgress = (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('sesiones', 
          { current: i + 1, total: eligibleSessions.length, message: `Sesión ${i + 1}/${eligibleSessions.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando sesión ${session.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 2: Resumen de NPCs
  // ========================================================================

  private static async executePhase2() {
    const npcs = await npcDbManager.getAll();
    const summariesByNPC = new Map<string, any[]>();

    // Agrupar resúmenes por NPC
    for (const summary of await sessionSummaryDbManager.getAll()) {
      const existing = summariesByNPC.get(summary.npcId) || [];
      existing.push(summary);
      summariesByNPC.set(summary.npcId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${npcs.length} NPCs`);
    
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const summaries = summariesByNPC.get(npc.id) || [];

      // Calcular hash de los resúmenes
      const currentHash = generateSessionSummariesHash(summaries);
      
      // Obtener último resumen de NPC
      const lastNPCSummary = await npcSummaryDbManager.getLatest(npc.id);
      
      // Verificar si hubo cambios
      if (lastNPCSummary?.sessionHash === currentHash) {
        console.log(`[ResumenGeneral] NPC ${npc.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE NPC
        const result = await executeTrigger({
          mode: 'resumen_npc',
          npcid: npc.id
        } as ResumenNPCTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen NPC ${npc.id}:`, result.error);
          continue;
        }

        // Guardar nuevo resumen con hash
        await npcSummaryDbManager.create({
          npcId: npc.id,
          summary: result.data.summary,
          sessionHash: currentHash,
          version: (lastNPCSummary?.version || 0) + 1
        });

        // Actualizar progreso
        const progress = ((i + 1) / npcs.length) * 100;
        const overallProgress = 20 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('npcs', 
          { current: i + 1, total: npcs.length, message: `NPC ${i + 1}/${npcs.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando NPC ${npc.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 3: Resumen de Edificios
  // ========================================================================

  private static async executePhase3() {
    const edificios = await edificioDbManager.getAll();
    const summariesByEdificio = new Map<string, any[]>();

    // Agrupar resúmenes de NPCs por edificio
    for (const summary of await npcSummaryDbManager.getAll()) {
      const existing = summariesByEdificio.get(summary.npcId) || [];
      existing.push(summary);
      summariesByEdificio.set(summary.npcId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${edificios.length} edificios`);
    
    for (let i = 0; i < edificios.length; i++) {
      const edificio = edificios[i];
      
      // Obtener resúmenes de NPCs que pertenecen a este edificio
      const npcsInEdificio = await npcDbManager.getByEdificioId(edificio.id);
      const npcSummaries: any[] = [];
      
      for (const npc of npcsInEdificio) {
        const summary = await npcSummaryDbManager.getLatest(npc.id);
        if (summary) npcSummaries.push(summary);
      }

      const currentHash = generateNPCSummariesHash(npcSummaries);
      const lastEdificioSummary = await edificioSummaryDbManager.getLatest(edificio.id);
      
      if (lastEdificioSummary?.npcHash === currentHash) {
        console.log(`[ResumenGeneral] Edificio ${edificio.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE EDIFICIO
        const result = await executeTrigger({
          mode: 'resumen_edificio',
          edificioid: edificio.id
        } as ResumenEdificioTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen edificio ${edificio.id}:`, result.error);
          continue;
        }

        await edificioSummaryDbManager.create({
          edificioId: edificio.id,
          summary: result.data.summary,
          npcHash: currentHash,
          version: (lastEdificioSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / edificios.length) * 100;
        const overallProgress = 40 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('edificios', 
          { current: i + 1, total: edificios.length, message: `Edificio ${i + 1}/${edificios.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando edificio ${edificio.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 4: Resumen de Pueblos
  // ========================================================================

  private static async executePhase4() {
    const pueblos = await puebloDbManager.getAll();
    const summariesByPueblo = new Map<string, any[]>();

    // Agrupar resúmenes de edificios por pueblo
    for (const summary of await edificioSummaryDbManager.getAll()) {
      const existing = summariesByPueblo.get(summary.edificioId) || [];
      existing.push(summary);
      summariesByPueblo.set(summary.edificioId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${pueblos.length} pueblos`);
    
    for (let i = 0; i < pueblos.length; i++) {
      const pueblo = pueblos[i];
      
      // Obtener resúmenes de edificios que pertenecen a este pueblo
      const edificiosInPueblo = await edificioDbManager.getByPuebloId(pueblo.id);
      const edificioSummaries: any[] = [];
      
      for (const edificio of edificiosInPueblo) {
        const summary = await edificioSummaryDbManager.getLatest(edificio.id);
        if (summary) edificioSummaries.push(summary);
      }

      const currentHash = generateEdificioSummariesHash(edificioSummaries);
      const lastPuebloSummary = await puebloSummaryDbManager.getLatest(pueblo.id);
      
      if (lastPuebloSummary?.edificioHash === currentHash) {
        console.log(`[ResumenGeneral] Pueblo ${pueblo.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE PUEBLO
        const result = await executeTrigger({
          mode: 'resumen_pueblo',
          pueblid: pueblo.id
        } as ResumenPuebloTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen pueblo ${pueblo.id}:`, result.error);
          continue;
        }

        await puebloSummaryDbManager.create({
          puebloId: pueblo.id,
          summary: result.data.summary,
          edificioHash: currentHash,
          version: (lastPuebloSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / pueblos.length) * 100;
        const overallProgress = 60 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('pueblos', 
          { current: i + 1, total: pueblos.length, message: `Pueblo ${i + 1}/${pueblos.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando pueblo ${pueblo.id}:`, error);
      }
    }
  }

  // ========================================================================
  // FASE 5: Resumen de Mundos
  // ========================================================================

  private static async executePhase5() {
    const mundos = await worldDbManager.getAll();
    const summariesByMundo = new Map<string, any[]>();

    // Agrupar resúmenes de pueblos por mundo
    for (const summary of await puebloSummaryDbManager.getAll()) {
      const existing = summariesByMundo.get(summary.puebloId) || [];
      existing.push(summary);
      summariesByMundo.set(summary.puebloId, existing);
    }

    console.log(`[ResumenGeneral] Procesando ${mundos.length} mundos`);
    
    for (let i = 0; i < mundos.length; i++) {
      const mundo = mundos[i];
      
      // Obtener resúmenes de pueblos que pertenecen a este mundo
      const pueblosInMundo = await puebloDbManager.getByWorldId(mundo.id);
      const puebloSummaries: any[] = [];
      
      for (const pueblo of pueblosInMundo) {
        const summary = await puebloSummaryDbManager.getLatest(pueblo.id);
        if (summary) puebloSummaries.push(summary);
      }

      const currentHash = generatePuebloSummariesHash(puebloSummaries);
      const lastWorldSummary = await worldSummaryDbManager.getLatest(mundo.id);
      
      if (lastWorldSummary?.puebloHash === currentHash) {
        console.log(`[ResumenGeneral] Mundo ${mundo.id} sin cambios, SKIP`);
        continue;
      }

      try {
        // ✅ SIMULAR HTTP REQUEST DE RESUMEN DE MUNDO
        const result = await executeTrigger({
          mode: 'resumen_mundo',
          mundoid: mundo.id
        } as ResumenMundoTriggerPayload);

        if (!result.success) {
          console.error(`[ResumenGeneral] ❌ Error resumen mundo ${mundo.id}:`, result.error);
          continue;
        }

        await worldSummaryDbManager.create({
          worldId: mundo.id,
          summary: result.data.summary,
          puebloHash: currentHash,
          version: (lastWorldSummary?.version || 0) + 1
        });

        const progress = ((i + 1) / mundos.length) * 100;
        const overallProgress = 80 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('mundos', 
          { current: i + 1, total: mundos.length, message: `Mundo ${i + 1}/${mundos.length}` },
          overallProgress
        );
      } catch (error) {
        console.error(`[ResumenGeneral] ❌ Error procesando mundo ${mundo.id}:`, error);
      }
    }
  }
}

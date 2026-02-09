import fs from 'fs/promises';
import path from 'path';

async function updateService() {
  const filePath = path.join(process.cwd(), 'src/lib/resumenGeneralService.ts');
  
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Reemplazo 1: executePhase1 con estadísticas
  const phase1Old = `  private static async executePhase1(config: ResumenGeneralConfig) {
    const sessions = await sessionDbManager.getAll();
    const eligibleSessions = sessions.filter(s => s.messages.length >= config.minMessages);
    
    console.log(\`[ResumenGeneral] \${eligibleSessions.length} sesiones elegibles (>= \${config.minMessages} mensajes)\`);
    
    for (let i = 0; i < eligibleSessions.length; i++) {
      const session = eligibleSessions[i];
      
      try {
        // M-bM-^E SIMULAR HTTP REQUEST DE RESUMEN DE SESIM-CM-^SN
        const result = await executeTrigger({
          mode: 'resumen_sesion',
          npcid: session.npcId,
          playersessionid: session.id
        } as ResumenSesionTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] M-bM-^]M-^L Error resumen sesiM-CM-3n \${session.id}:\`, result.error);
        }

        // Actualizar progreso
        const progress = ((i + 1) / eligibleSessions.length) * 100;
        const overallProgress = (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('sesiones', 
          { current: i + 1, total: eligibleSessions.length, message: \`SesiM-CM-3n \${i + 1}/\${eligibleSessions.length}\` }, 
          overallProgress
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] M-bM-^]M-^L Error procesando sesiM-CM-3n \${session.id}:\`, error);
      }
    }
  }`;

  const phase1New = `  private static async executePhase1(config: ResumenGeneralConfig) {
    const sessions = await sessionDbManager.getAll();
    const eligibleSessions = sessions.filter(s => s.messages.length >= config.minMessages);
    const skippedSessions = sessions.length - eligibleSessions.length;
    
    console.log(\`[ResumenGeneral] \${eligibleSessions.length} sesiones elegibles, \${skippedSessions} ignoradas (>= \${config.minMessages} mensajes)\`);
    
    let completed = 0;
    
    for (let i = 0; i < eligibleSessions.length; i++) {
      const session = eligibleSessions[i];
      
      try {
        const result = await executeTrigger({
          mode: 'resumen_sesion',
          npcid: session.npcId,
          playersessionid: session.id
        } as ResumenSesionTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen sesion \${session.id}:\`, result.error);
        } else {
          completed++;
        }

        const progress = ((i + 1) / eligibleSessions.length) * 100;
        const overallProgress = (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('sesiones', 
          { current: i + 1, total: eligibleSessions.length, message: \`Sesion \${i + 1}/\${eligibleSessions.length}\` }, 
          overallProgress,
          { completed, skipped: skippedSessions }
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando sesion \${session.id}:\`, error);
      }
    }
    
    await this.updateProgress('sesiones',
      { current: eligibleSessions.length, total: eligibleSessions.length, message: 'Completada' },
      20,
      { completed, skipped: skippedSessions }
    );
  }`;

  // Reemplazo 2: executePhase2 con estadísticas  
  const phase2Old = `  private static async executePhase2() {
    const npcs = await npcDbManager.getAll();
    const summariesByNPC = new Map<string, any[]>();

    // Agrupar resumenes por NPC
    for (const summary of await sessionSummaryDbManager.getAll()) {
      const existing = summariesByNPC.get(summary.npcId) || [];
      existing.push(summary);
      summariesByNPC.set(summary.npcId, existing);
    }

    console.log(\`[ResumenGeneral] Procesando \${npcs.length} NPCs\`);
    
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const summaries = summariesByNPC.get(npc.id) || [];

      // Calcular hash de los resumenes
      const currentHash = generateSessionSummariesHash(summaries);
      
      // Obtener ultimo resumen de NPC
      const lastNPCSummary = await npcSummaryDbManager.getLatest(npc.id);
      
      // Verificar si hubo cambios
      if (lastNPCSummary?.sessionHash === currentHash) {
        console.log(\`[ResumenGeneral] NPC \${npc.id} sin cambios, SKIP\`);
        continue;
      }

      try {
        const result = await executeTrigger({
          mode: 'resumen_npc',
          npcid: npc.id
        } as ResumenNPCTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen NPC \${npc.id}:\`, result.error);
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
          { current: i + 1, total: npcs.length, message: \`NPC \${i + 1}/\${npcs.length}\` }, 
          overallProgress
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando NPC \${npc.id}:\`, error);
      }
    }
  }`;

  const phase2New = `  private static async executePhase2() {
    const npcs = await npcDbManager.getAll();
    const summariesByNPC = new Map<string, any[]>();

    for (const summary of await sessionSummaryDbManager.getAll()) {
      const existing = summariesByNPC.get(summary.npcId) || [];
      existing.push(summary);
      summariesByNPC.set(summary.npcId, existing);
    }

    console.log(\`[ResumenGeneral] Procesando \${npcs.length} NPCs\`);
    
    let completed = 0;
    let skipped = 0;
    
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const summaries = summariesByNPC.get(npc.id) || [];

      const currentHash = generateSessionSummariesHash(summaries);
      const lastNPCSummary = await npcSummaryDbManager.getLatest(npc.id);
      
      if (lastNPCSummary?.sessionHash === currentHash) {
        console.log(\`[ResumenGeneral] NPC \${npc.id} sin cambios, SKIP\`);
        skipped++;
        continue;
      }

      try {
        const result = await executeTrigger({
          mode: 'resumen_npc',
          npcid: npc.id
        } as ResumenNPCTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen NPC \${npc.id}:\`, result.error);
          continue;
        }

        await npcSummaryDbManager.create({
          npcId: npc.id,
          summary: result.data.summary,
          sessionHash: currentHash,
          version: (lastNPCSummary?.version || 0) + 1
        });
        
        completed++;

        const progress = ((i + 1) / npcs.length) * 100;
        const overallProgress = 20 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('npcs', 
          { current: i + 1, total: npcs.length, message: \`NPC \${i + 1}/\${npcs.length}\` }, 
          overallProgress,
          { completed, skipped }
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando NPC \${npc.id}:\`, error);
      }
    }
    
    await this.updateProgress('npcs',
      { current: npcs.length, total: npcs.length, message: 'Completada' },
      40,
      { completed, skipped }
    );
  }`;

  // Aplicar reemplazos
  if (content.includes(phase1Old)) {
    content = content.replace(phase1Old, phase1New);
    console.log('[Update] executePhase1 actualizada');
  }
  
  if (content.includes(phase2Old)) {
    content = content.replace(phase2Old, phase2New);
    console.log('[Update] executePhase2 actualizada');
  }
  
  await fs.writeFile(filePath, content, 'utf-8');
  console.log('[Update] Archivo actualizado');
}

updateService().catch(console.error);

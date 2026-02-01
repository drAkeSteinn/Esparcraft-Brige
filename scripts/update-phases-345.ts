import fs from 'fs/promises';
import path from 'path';

async function updateService() {
  const filePath = path.join(process.cwd(), 'src/lib/resumenGeneralService.ts');
  let content = await fs.readFile(filePath, 'utf-8');

  // Reemplazo 3: executePhase3 (Edificios)
  const phase3Pattern = /private static async executePhase3\(\) \{[\s\S]*?\n  \}/;
  const phase3New = `  private static async executePhase3() {
    const edificios = await edificioDbManager.getAll();
    const summariesByEdificio = new Map<string, any[]>();

    for (const summary of await npcSummaryDbManager.getAll()) {
      const existing = summariesByEdificio.get(summary.npcId) || [];
      existing.push(summary);
      summariesByEdificio.set(summary.npcId, existing);
    }

    console.log(\`[ResumenGeneral] Procesando \${edificios.length} edificios\`);
    
    let completed = 0;
    let skipped = 0;
    
    for (let i = 0; i < edificios.length; i++) {
      const edificio = edificios[i];
      const summaries = summariesByEdificio.get(edificio.id) || [];

      const currentHash = generateNPCSummariesHash(summaries);
      const lastEdificioSummary = await edificioSummaryDbManager.getLatest(edificio.id);
      
      if (lastEdificioSummary?.npcHash === currentHash) {
        console.log(\`[ResumenGeneral] Edificio \${edificio.id} sin cambios, SKIP\`);
        skipped++;
        continue;
      }

      try {
        const result = await executeTrigger({
          mode: 'resumen_edificio',
          edificioid: edificio.id
        } as ResumenEdificioTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen edificio \${edificio.id}:\`, result.error);
          continue;
        }

        await edificioSummaryDbManager.create({
          edificioId: edificio.id,
          summary: result.data.summary,
          npcHash: currentHash,
          version: (lastEdificioSummary?.version || 0) + 1
        });
        
        completed++;

        const progress = ((i + 1) / edificios.length) * 100;
        const overallProgress = 40 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('edificios',
          { current: i + 1, total: edificios.length, message: \`Edificio \${i + 1}/\${edificios.length}\` },
          overallProgress,
          { completed, skipped }
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando edificio \${edificio.id}:\`, error);
      }
    }
    
    await this.updateProgress('edificios',
      { current: edificios.length, total: edificios.length, message: 'Completada' },
      60,
      { completed, skipped }
    );
  }`;

  // Reemplazo 4: executePhase4 (Pueblos)
  const phase4Pattern = /private static async executePhase4\(\) \{[\s\S]*?\n  \}/;
  const phase4New = `  private static async executePhase4() {
    const pueblos = await puebloDbManager.getAll();
    const summariesByPueblo = new Map<string, any[]>();

    for (const summary of await edificioSummaryDbManager.getAll()) {
      const existing = summariesByPueblo.get(summary.puebloId) || [];
      existing.push(summary);
      summariesByPueblo.set(summary.puebloId, existing);
    }

    console.log(\`[ResumenGeneral] Procesando \${pueblos.length} pueblos\`);
    
    let completed = 0;
    let skipped = 0;
    
    for (let i = 0; i < pueblos.length; i++) {
      const pueblo = pueblos[i];
      const summaries = summariesByPueblo.get(pueblo.id) || [];

      const currentHash = generateEdificioSummariesHash(summaries);
      const lastPuebloSummary = await puebloSummaryDbManager.getLatest(pueblo.id);
      
      if (lastPuebloSummary?.edificioHash === currentHash) {
        console.log(\`[ResumenGeneral] Pueblo \${pueblo.id} sin cambios, SKIP\`);
        skipped++;
        continue;
      }

      try {
        const result = await executeTrigger({
          mode: 'resumen_pueblo',
          pueblid: pueblo.id
        } as ResumenPuebloTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen pueblo \${pueblo.id}:\`, result.error);
          continue;
        }

        await puebloSummaryDbManager.create({
          puebloId: pueblo.id,
          summary: result.data.summary,
          edificioHash: currentHash,
          version: (lastPuebloSummary?.version || 0) + 1
        });
        
        completed++;

        const progress = ((i + 1) / pueblos.length) * 100;
        const overallProgress = 60 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('pueblos',
          { current: i + 1, total: pueblos.length, message: \`Pueblo \${i + 1}/\${pueblos.length}\` },
          overallProgress,
          { completed, skipped }
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando pueblo \${pueblo.id}:\`, error);
      }
    }
    
    await this.updateProgress('pueblos',
      { current: pueblos.length, total: pueblos.length, message: 'Completada' },
      80,
      { completed, skipped }
    );
  }`;

  // Reemplazo 5: executePhase5 (Mundos)
  const phase5Pattern = /private static async executePhase5\(\) \{[\s\S]*?\n  \}/;
  const phase5New = `  private static async executePhase5() {
    const mundos = await worldDbManager.getAll();
    const summariesByMundo = new Map<string, any[]>();

    for (const summary of await puebloSummaryDbManager.getAll()) {
      const existing = summariesByMundo.get(summary.mundoId) || [];
      existing.push(summary);
      summariesByMundo.set(summary.mundoId, existing);
    }

    console.log(\`[ResumenGeneral] Procesando \${mundos.length} mundos\`);
    
    let completed = 0;
    let skipped = 0;
    
    for (let i = 0; i < mundos.length; i++) {
      const mundo = mundos[i];
      const summaries = summariesByMundo.get(mundo.id) || [];

      const currentHash = generatePuebloSummariesHash(summaries);
      const lastWorldSummary = await worldSummaryDbManager.getLatest(mundo.id);
      
      if (lastWorldSummary?.puebloHash === currentHash) {
        console.log(\`[ResumenGeneral] Mundo \${mundo.id} sin cambios, SKIP\`);
        skipped++;
        continue;
      }

      try {
        const result = await executeTrigger({
          mode: 'resumen_mundo',
          mundoid: mundo.id
        } as ResumenMundoTriggerPayload);

        if (!result.success) {
          console.error(\`[ResumenGeneral] Error resumen mundo \${mundo.id}:\`, result.error);
          continue;
        }

        await worldSummaryDbManager.create({
          worldId: mundo.id,
          summary: result.data.summary,
          puebloHash: currentHash,
          version: (lastWorldSummary?.version || 0) + 1
        });
        
        completed++;

        const progress = ((i + 1) / mundos.length) * 100;
        const overallProgress = 80 + (1 / 5) * 100 * (progress / 100);
        await this.updateProgress('mundos',
          { current: i + 1, total: mundos.length, message: \`Mundo \${i + 1}/\${mundos.length}\` },
          overallProgress,
          { completed, skipped }
        );
      } catch (error) {
        console.error(\`[ResumenGeneral] Error procesando mundo \${mundo.id}:\`, error);
      }
    }
    
    await this.updateProgress('mundos',
      { current: mundos.length, total: mundos.length, message: 'Completada' },
      100,
      { completed, skipped }
    );
  }`;

  // Aplicar reemplazos
  let replacements = 0;
  
  if (phase3Pattern.test(content)) {
    content = content.replace(phase3Pattern, phase3New);
    console.log('[Update] executePhase3 actualizada');
    replacements++;
  }
  
  if (phase4Pattern.test(content)) {
    content = content.replace(phase4Pattern, phase4New);
    console.log('[Update] executePhase4 actualizada');
    replacements++;
  }
  
  if (phase5Pattern.test(content)) {
    content = content.replace(phase5Pattern, phase5New);
    console.log('[Update] executePhase5 actualizada');
    replacements++;
  }
  
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`[Update] Archivo actualizado (${replacements} reemplazos)`);
}

updateService().catch(console.error);

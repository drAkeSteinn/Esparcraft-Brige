// Resumen NPC trigger handler - VERSIÓN CORREGIDA
export async function handleResumenNPCTrigger(payload: ResumenNPCTriggerPayload): Promise<{ success: boolean; memory: Record<string, any> }> {
  const { npcid, systemPrompt: payloadSystemPrompt, allSummaries: payloadAllSummaries } = payload;

  // Get NPC
  const npc = await npcDbManager.getById(npcid);
  if (!npc) {
    throw new Error(`NPC with id ${npcid} not found`);
  }

  // Get context (world, pueblo, edificio)
  const world = await worldDbManager.getById(npc.location.worldId);
  const pueblo = npc.location.puebloId ? await puebloDbManager.getById(npc.location.puebloId) : undefined;
  const edificio = npc.location.edificioId ? await edificioDbManager.getById(npc.location.edificioId) : undefined;

  // ✅ LEER CONFIGURACIÓN DE SYSTEM PROMPT DEL ARCHIVO ESPECÍFICO
  let configSystemPrompt = payloadSystemPrompt;

  // Si no se proporciona systemPrompt en el payload, cargar del archivo de configuración
  if (!configSystemPrompt) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'db', 'resumen-npc-trigger-config.json');

      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        configSystemPrompt = config.systemPrompt || '';
        console.log('[handleResumenNPCTrigger] System Prompt cargado del archivo de configuración');
      } catch (error) {
        // El archivo no existe o hay error al leerlo, usar string vacío
        console.log('[handleResumenNPCTrigger] No hay configuración de System Prompt guardada, usando default');
        configSystemPrompt = '';
      }
    } catch (error) {
      console.error('[handleResumenNPCTrigger] Error cargando configuración de System Prompt:', error);
      configSystemPrompt = '';
    }
  }

  // ✅ OBTENER RESÚMENES DE SESIONES DEL NPC CON METADATA
  const npcSummaries = await sessionSummaryDbManager.getByNPCId(npcid);
  console.log(`[handleResumenNPCTrigger] Obtenidos ${npcSummaries.length} resúmenes para el NPC ${npcid}`);

  // ✅ CALCULAR HASH ACTUAL DE LOS RESÚMENES DE SESIONES DEL NPC
  const currentHash = generateSessionSummariesHash(npcSummaries);

  // ✅ OBTENER ÚLTIMO RESUMEN GUARDADO DEL NPC
  const npcSummaryMgr = new NPCSummaryManager();
  const lastNPCSummary = await npcSummaryMgr.getLatest(npcid);

  console.log(`[handleResumenNPCTrigger] NPC ${npcid} - Último hash guardado: ${lastNPCSummary?.sessionHash || 'N/A'}, Versión: ${lastNPCSummary?.version || 0}`);

  // ✅ VERIFICAR SI HUBO CAMBIOS EN LOS RESÚMENES DE SESIONES DEL NPC - ANTES DE LLAMAR AL LLM
  if (lastNPCSummary?.sessionHash === currentHash) {
    console.log(`[handleResumenNPCTrigger] NPC ${npcid} - SIN CAMBIOS, SKIP`);
    return {
      success: false,
      error: `No hubo cambios en las sesiones del NPC ${npcid}. Los resúmenes son iguales.`
    };
  }

  console.log(`[handleResumenNPCTrigger] NPC ${npcid} - HAY CAMBIOS, PROCEDIENDO CON RESUMEN`);

  // ✅ FORMATEAR LA LISTA DE RESÚMENES CON EL NUEVO FORMATO
  let allSummariesFormatted = payloadAllSummaries;

  if (!allSummariesFormatted && npcSummaries.length > 0) {
    // Agrupar resúmenes por nombre de jugador
    const summariesByPlayer = npcSummaries.reduce((acc, s) => {
      const playerName = s.playerName || 'Unknown';
      if (!acc[playerName]) {
        acc[playerName] = [];
      }
      acc[playerName].push(s);
      return acc;
    }, {} as Record<string, SessionSummary[]>);

    // Construir el formato especificado
    const memoriesSections: string[] = [];
    for (const [playerName, summaries] of Object.entries(summariesByPlayer)) {
      memoriesSections.push(`Memoria de ${playerName}`);
      summaries.forEach(s => {
        memoriesSections.push(s.summary);
      });
    }

    allSummariesFormatted = `***
MEMORIAS DE LOS AVENTUREROS
${memoriesSections.join('\n')}
***`;
    console.log('[handleResumenNPCTrigger] Resúmenes formateados correctamente');
  }

  // Get existing memory from creator_notes (DB) instead of npcStateManager
  const existingMemory = getCardField(npc?.card, 'creator_notes', '');

  // ✅ CONSTRUIR EL SYSTEM PROMPT PARA RESUMEN NPC (SIN HEADERS)
  // El system prompt puede incluir keys de plantilla como {{npc.name}}, {{npc.personality}}, etc.
  const npcName = getCardField(npc?.card, 'name', '');

  // Construir contexto de variables para reemplazo
  const varContext: VariableContext = {
    npc,
    world,
    pueblo,
    edificio,
    char: npcName
  };

  // Build prompt con system prompt personalizado y resúmenes formateados
  let messages = buildNPCSummaryPrompt(
    npc,
    [], // No necesitamos summaries antiguos como array, usamos allSummaries
    existingMemory,
    {
      systemPrompt: configSystemPrompt,
      allSummaries: allSummariesFormatted
    }
  );

  // ✅ REEMPLAZAR VARIABLES PRIMARIAS Y PLANTILLAS DE GRIMORIO EN EL SYSTEM PROMPT
  const grimorioCards = grimorioManager.getAll();
  const systemPromptRaw = messages[0]?.content || '';
  const { result: systemPromptResolved } = resolveAllVariables(systemPromptRaw, varContext, grimorioCards);

  // Actualizar el mensaje system con las variables reemplazadas
  messages = [
    {
      role: 'system',
      content: systemPromptResolved,
      timestamp: new Date().toISOString()
    },
    ...messages.slice(1) // Mantener el mensaje user con las memorias
  ];

  console.log('[handleResumenNPCTrigger] System Prompt procesado con variables y plantillas');

  // Call LLM - SOLO SE EJECUTA SI HUBO CAMBIOS
  const response = await callLLM(messages);

  // ✅ GUARDAR EN TABLA NPCSummary PARA HISTÓRICO (CON VERSIÓN)
  const nextVersion = (lastNPCSummary?.version || 0) + 1;
  await npcSummaryMgr.create({
    npcId: npcid,
    summary: response,
    sessionHash: currentHash,
    version: nextVersion
  });
  console.log(`[handleResumenNPCTrigger] NPC ${npcid} - Resumen guardado en DB con versión ${nextVersion}`);

  // ✅ GUARDAR RESUMEN EN creator_notes DE LA CARD DEL NPC
  // Reemplazar siempre el contenido de creator_notes con el resumen generado
  if (npc?.card) {
    const updatedCard: any = {
      ...npc.card
    };

    // Actualizar creator_notes en data si existe data, sino crearlo
    if (updatedCard.data) {
      updatedCard.data = {
        ...updatedCard.data,
        creator_notes: response
      };
    } else {
      updatedCard.data = {
        creator_notes: response
      };
    }

    await npcDbManager.update(npcid, { card: updatedCard });
    console.log('[handleResumenNPCTrigger] Resumen guardado en creator_notes de la Card del NPC');
  }

  return {
    success: true,
    summary: response,
    version: nextVersion
  };
}

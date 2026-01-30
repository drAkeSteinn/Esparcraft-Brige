export function buildNPCSummaryPrompt(
  npc: any,
  sessionSummaries: string[],
  npcMemory: any,
  options?: {
    systemPrompt?: string;
    allSummaries?: string;
  }
): any[] {
  const customSystemPrompt = options?.systemPrompt;

  const systemPromptContent = customSystemPrompt && customSystemPrompt.trim()
    ? '=== SYSTEM PROMPT ===\n' + customSystemPrompt + '\n'
    : '=== SYSTEM PROMPT ===\nEres un asistente experto en consolidacion de memoria narrativa. Tu tarea es crear una memoria consolidada de un NPC.\n\nINSTRUCCIONES:\n- Crea un resumen que capture la esencia y evolucion del personaje\n- Incluye eventos importantes que han moldeado al NPC\n- Identifica relaciones y conexiones significativas\n- Manten la coherencia con la personalidad del NPC\n- El resumen debe servir como memoria a largo plazo\n\nFormato esperado:\nRESUMEN_CONSOLIDADO: [Resumen completo del personaje y su evolucion]\nEVENTOS_IMPORTANTES: [Lista de eventos importantes]\nRELACIONES: [Relaciones importantes con otros personajes o jugadores]\nPERSPECTIVA_ACTUAL: [Como el NPC ve el mundo actualmente]\n';

  const messages = [
    {
      role: 'system',
      content: systemPromptContent,
      timestamp: new Date().toISOString()
    }
  ];

  let prompt = '=== DATOS DEL PERSONAJE ===\n';
  prompt += 'Personaje: ' + (npc.card?.data?.name || npc.card?.name || 'Unknown') + '\n';
  prompt += 'Personalidad: ' + (npc.card?.data?.personality || npc.card?.personality || 'No especificada') + '\n';
  prompt += 'Escenario: ' + (npc.card?.data?.scenario || npc.card?.scenario || 'No especificado') + '\n\n';

  if (npcMemory && npcMemory.consolidatedSummary) {
    prompt += '=== MEMORIA ANTERIOR ===\n';
    prompt += npcMemory.consolidatedSummary + '\n\n';
  }

  if (options?.allSummaries && options.allSummaries.trim()) {
    prompt += '=== MEMORIAS DE LOS AVENTUREROS ===\n';
    prompt += options.allSummaries + '\n\n';
  } else if (sessionSummaries.length > 0) {
    prompt += '=== MEMORIAS DE LOS AVENTUREROS ===\n';
    prompt += 'Resumenes de sesiones recientes:\n' + sessionSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
  }

  prompt += '=== INSTRUCCION ===\n';
  prompt += 'Genera la memoria consolidada actualizada:';

  messages.push({
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  });

  return messages;
}

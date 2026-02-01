import crypto from 'crypto';

/**
 * Genera un hash SHA256 de un string
 */
export function generateHash(data: string): string {
  if (!data) {
    return generateHash('empty');
  }
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un hash de los resúmenes de sesiones de un NPC
 * Se usa para detectar si hubo cambios entre ejecuciones
 */
export function generateSessionSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  // Ordenar por timestamp para consistencia
  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Concatenar de forma determinista
  const concatenated = sortedSummaries.map(s => 
    `${s.sessionId}:${s.summary}:${s.timestamp}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de NPCs de un edificio
 */
export function generateNPCSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.npcId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de edificios de un pueblo
 */
export function generateEdificioSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.edificioId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Genera un hash de los resúmenes de pueblos de un mundo
 */
export function generatePuebloSummariesHash(summaries: any[]): string {
  if (!summaries || summaries.length === 0) {
    return generateHash('empty');
  }

  const sortedSummaries = [...summaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const concatenated = sortedSummaries.map(s => 
    `${s.puebloId}:${s.summary}:${s.version}:${s.createdAt}`
  ).join('|||');

  return generateHash(concatenated);
}

/**
 * Context Retrieval para Embeddings
 *
 * Recupera contexto relevante de embeddings basado en:
 * - Ubicación del NPC (world, pueblo, edificio)
 * - Tipo de consulta (chat, lore, etc.)
 * - Umbral de similitud configurable
 */

import { NPC, World, Pueblo, Edificio, SourceType } from '../types';

interface RetrievalConfig {
  enabled: boolean;
  threshold?: number; // 0-1, default 0.7
  maxTokens?: number; // Máximo de tokens de contexto
  useNamespace?: string; // Namespace específico o 'auto'
  includeSourceTypes?: SourceType[];
  maxResults?: number; // Máximo de embeddings a recuperar
  hybridSearch?: boolean; // Usar búsqueda híbrida (texto + vector)
}

interface RetrievedContext {
  documents: Array<{
    id: string;
    content: string;
    namespace: string;
    source_type: SourceType;
    source_id?: string;
    metadata: any;
    score: number;
  }>;
  totalTokens: number;
  truncated: boolean;
}

/**
 * Obtiene embeddings relevantes basado en el contexto del NPC
 */
export async function retrieveRelevantEmbeddings(
  npc: NPC,
  world: World | null,
  pueblo: Pueblo | null,
  edificio: Edificio | null,
  query?: string,
  config: RetrievalConfig = {}
): Promise<RetrievedContext> {
  const {
    enabled = true,
    threshold = 0.7,
    maxTokens = 2000,
    useNamespace = 'auto',
    includeSourceTypes,
    maxResults = 5,
    hybridSearch = false
  } = config;

  if (!enabled) {
    return {
      documents: [],
      totalTokens: 0,
      truncated: false
    };
  }

  try {
    // Determinar namespace basado en la ubicación del NPC
    let namespaces: string[] = [];

    if (useNamespace === 'auto') {
      // Strategy: Search in multiple namespaces ordered by specificity
      if (edificio) {
        // Si el NPC está en un edificio, buscar ahí primero
        namespaces = [`npc:${npc.id}`, `edificio:${edificio.id}`, `pueblo:${pueblo?.id}`, `world:${world?.id}`];
      } else if (pueblo) {
        // Si está en un pueblo pero no edificio específico
        namespaces = [`npc:${npc.id}`, `pueblo:${pueblo?.id}`, `world:${world?.id}`];
      } else if (world) {
        // Solo a nivel mundo
        namespaces = [`npc:${npc.id}`, `world:${world?.id}`];
      } else {
        // Default: buscar en namespace del NPC
        namespaces = [`npc:${npc.id}`];
      }
    } else {
      namespaces = [useNamespace];
    }

    // Filtrar por tipos de fuente si se especificaron
    const sourceTypes = includeSourceTypes || ['npc', 'world', 'pueblo', 'edificio', 'session', 'custom'];

    // Hacer búsqueda en cada namespace hasta alcanzar el límite de tokens
    const allDocuments: RetrievedContext['documents'] = [];
    let totalTokens = 0;
    const maxTokensPerNamespace = maxTokens / namespaces.length;

    for (const namespace of namespaces) {
      if (totalTokens >= maxTokens) break;

      try {
        const endpoint = hybridSearch ? '/api/search/hybrid' : '/api/search/vector';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query || npc.card.data?.description || npc.card.description || '',
            namespace,
            limit: maxResults,
            threshold,
            source_types: sourceTypes
          })
        });

        if (!response.ok) {
          console.warn(`Failed to search namespace ${namespace}: ${response.statusText}`);
          continue;
        }

        const result = await response.json();

        if (result.success && result.data && Array.isArray(result.data)) {
          // Calcular tokens de cada documento
          const documentsWithTokens = result.data
            .map((doc: any) => ({
              ...doc,
              estimatedTokens: Math.ceil((doc.content || '').length / 4) // ~4 chars per token
            }))
            .filter((doc: any) => {
              // Filtrar por tipos de fuente si se especificaron
              if (includeSourceTypes && doc.source_type) {
                return includeSourceTypes.includes(doc.source_type);
              }
              return true;
            });

          // Agregar documentos hasta alcanzar límite de tokens
          for (const doc of documentsWithTokens) {
            if (totalTokens + doc.estimatedTokens > maxTokensPerNamespace) {
              break;
            }
            allDocuments.push(doc);
            totalTokens += doc.estimatedTokens;
          }
        }
      } catch (error) {
        console.error(`Error searching namespace ${namespace}:`, error);
        continue;
      }
    }

    // Ordenar por score de similitud
    allDocuments.sort((a, b) => b.score - a.score);

    return {
      documents: allDocuments.slice(0, maxResults),
      totalTokens,
      truncated: totalTokens >= maxTokens
    };
  } catch (error) {
    console.error('Error retrieving embeddings:', error);
    return {
      documents: [],
      totalTokens: 0,
      truncated: false
    };
  }
}

/**
 * Formatea el contexto recuperado para incluir en el prompt
 */
export function formatRetrievedContext(context: RetrievedContext): string {
  if (context.documents.length === 0) {
    return '';
  }

  let formatted = '';
  formatted += '=== CONTEXTO RECUPERADO DE EMBEDDINGS ===\n\n';
  formatted += `Se recuperaron ${context.documents.length} documentos relevantes.\n\n`;

  context.documents.forEach((doc, index) => {
    formatted += `[${index + 1}] (Similitud: ${Math.round(doc.score * 100)}%)\n`;
    formatted += `Fuente: ${doc.source_type}`;
    if (doc.source_id) {
      formatted += ` (${doc.source_id.slice(0, 8)})`;
    }
    formatted += `\n`;
    formatted += `${doc.content}\n\n`;
  });

  if (context.truncated) {
    formatted += `(Contexto truncado para no exceder ${context.totalTokens} tokens)\n`;
  } else {
    formatted += `(Total: ~${context.totalTokens} tokens)\n`;
  }

  return formatted;
}

/**
 * Determina la configuración de retrieval basado en el tipo de operación
 */
export function getRetrievalConfigForOperation(
  operation: 'chat' | 'resumen_sesion' | 'resumen_npc' | 'nuevo_lore',
  context?: any
): RetrievalConfig {
  switch (operation) {
    case 'chat':
      // Para chat: contexto muy relevante, mayor límite de tokens
      return {
        enabled: true,
        threshold: 0.75, // Alta similitud
        maxTokens: 3000,
        useNamespace: 'auto',
        maxResults: 5,
        hybridSearch: true
      };

    case 'resumen_sesion':
      // Para resumenes: contexto moderado
      return {
        enabled: true,
        threshold: 0.6, // Similitud media
        maxTokens: 4000,
        useNamespace: 'auto',
        maxResults: 10,
        hybridSearch: true
      };

    case 'resumen_npc':
      // Para resumen de NPC: contexto amplio, muchos resultados
      return {
        enabled: true,
        threshold: 0.5, // Similitud media-baja para más variedad
        maxTokens: 5000,
        useNamespace: 'auto',
        maxResults: 20,
        hybridSearch: true
      };

    case 'nuevo_lore':
      // Para generar lore: contexto específico
      return {
        enabled: true,
        threshold: 0.8, // Similitud muy alta
        maxTokens: 2000,
        useNamespace: 'auto',
        maxResults: 3,
        hybridSearch: false
      };

    default:
      return {
        enabled: false
      };
  }
}

/**
 * Crea un namespace para un NPC basado en su ID
 */
export function createNPCNamespace(npc: NPC): string {
  return `npc:${npc.id}`;
}

/**
 * Crea namespaces para las ubicaciones del NPC
 */
export function createLocationNamespaces(
  npc: NPC,
  worldId?: string,
  puebloId?: string,
  edificioId?: string
): { npc: string; world: string; pueblo: string; edificio: string } {
  return {
    npc: createNPCNamespace(npc),
    world: worldId ? `world:${worldId}` : '',
    pueblo: puebloId ? `pueblo:${puebloId}` : '',
    edificio: edificioId ? `edificio:${edificioId}` : ''
  };
}

export type { RetrievalConfig, RetrievedContext };

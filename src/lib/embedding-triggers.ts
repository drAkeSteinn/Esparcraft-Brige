/**
 * Servicio de Triggers Automáticos de Embeddings
 *
 * Este servicio gestiona la creación automática de embeddings
 * cuando se crean o actualizan recursos en el sistema.
 *
 * Sistema de namespaces por entidad:
 *   - mundo:{worldId}
 *   - pueblo:{puebloId}
 *   - edificio:{edificioId}
 *   - npc:{npcId}
 *   - sesion:{sessionId}
 *
 * Al embeddear un recurso, se asegura primero que su namespace exista.
 */

import { getEmbeddingClient } from './embeddings/client';
import { worldManager, puebloManager, edificioManager, npcManager, sessionManager } from './fileManager';
import { getSimilarityThreshold, getMaxResults } from './config-persistence';
import { namespaceManager, buildNamespace, type EntityType } from './namespaceManager';

export class EmbeddingTriggers {
  /**
   * Genera embeddings automáticamente para un Mundo
   */
  static async embedWorld(worldId: string): Promise<void> {
    try {
      console.log(`🔄 Generando embeddings para mundo: ${worldId}`);

      const world = worldManager.getById(worldId);
      if (!world) {
        console.warn(`Mundo no encontrado: ${worldId}`);
        return;
      }

      const client = getEmbeddingClient();

      // Preparar contenido para embeddings
      const content = `
Mundo: ${world.name}

Estado del mundo:
${world.lore}
      `.trim();

      // Eliminar embeddings anteriores del mundo
      await client.deleteBySource('world', worldId);

      // Asegurar que el namespace del mundo exista
      const namespace = buildNamespace('mundo', worldId);
      await namespaceManager.ensureWorldNamespace(worldId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: world.name,
          type: 'world',
          name: world.name,
        },
        namespace,
        source_type: 'world',
        source_id: worldId
      });

      console.log(`✅ Embeddings creados para mundo: ${worldId} (namespace: ${namespace})`);
    } catch (error) {
      console.error(`Error generando embeddings para mundo ${worldId}:`, error);
    }
  }

  /**
   * Genera embeddings automáticamente para un Pueblo
   */
  static async embedPueblo(puebloId: string): Promise<void> {
    try {
      console.log(`🔄 Generando embeddings para pueblo: ${puebloId}`);

      const pueblo = puebloManager.getById(puebloId);
      if (!pueblo) {
        console.warn(`Pueblo no encontrado: ${puebloId}`);
        return;
      }

      const client = getEmbeddingClient();

      // Preparar contenido para embeddings
      const content = `
${pueblo.type === 'nacion' ? 'Nación' : 'Pueblo'}: ${pueblo.name}

Descripción:
${pueblo.description}
      `.trim();

      // Eliminar embeddings anteriores del pueblo
      await client.deleteBySource('pueblo', puebloId);

      // Asegurar que el namespace del pueblo (y su mundo padre) exista
      const namespace = buildNamespace('pueblo', puebloId);
      await namespaceManager.ensurePuebloNamespace(puebloId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: pueblo.name,
          type: 'pueblo',
          subtype: pueblo.type,
          name: pueblo.name,
          description: pueblo.description
        },
        namespace,
        source_type: 'pueblo',
        source_id: puebloId
      });

      console.log(`✅ Embeddings creados para pueblo: ${puebloId} (namespace: ${namespace})`);
    } catch (error) {
      console.error(`Error generando embeddings para pueblo ${puebloId}:`, error);
    }
  }

  /**
   * Genera embeddings automáticamente para un Edificio
   */
  static async embedEdificio(edificioId: string): Promise<void> {
    try {
      console.log(`🔄 Generando embeddings para edificio: ${edificioId}`);

      const edificio = edificioManager.getById(edificioId);
      if (!edificio) {
        console.warn(`Edificio no encontrado: ${edificioId}`);
        return;
      }

      const client = getEmbeddingClient();

      // Preparar contenido para embeddings
      const content = `
Edificio: ${edificio.name}

Estado del edificio:
${edificio.lore}

Ubicación:
Desde (${edificio.area.start.x}, ${edificio.area.start.y}, ${edificio.area.start.z})
hasta (${edificio.area.end.x}, ${edificio.area.end.y}, ${edificio.area.end.z})
      `.trim();

      // Eliminar embeddings anteriores del edificio
      await client.deleteBySource('edificio', edificioId);

      // Asegurar que el namespace del edificio (y su pueblo/mundo padre) exista
      const namespace = buildNamespace('edificio', edificioId);
      await namespaceManager.ensureEdificioNamespace(edificioId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: edificio.name,
          type: 'edificio',
          name: edificio.name,
          lore: edificio.lore,
          area: edificio.area
        },
        namespace,
        source_type: 'edificio',
        source_id: edificioId
      });

      console.log(`✅ Embeddings creados para edificio: ${edificioId} (namespace: ${namespace})`);
    } catch (error) {
      console.error(`Error generando embeddings para edificio ${edificioId}:`, error);
    }
  }

  /**
   * Genera embeddings automáticamente para un NPC
   */
  static async embedNPC(npcId: string): Promise<void> {
    try {
      console.log(`🔄 Generando embeddings para NPC: ${npcId}`);

      const npc = npcManager.getById(npcId);
      if (!npc) {
        console.warn(`NPC no encontrado: ${npcId}`);
        return;
      }

      const client = getEmbeddingClient();

      const card = npc.card.data || npc.card;

      // Preparar contenido para embeddings
      const content = `
Nombre: ${card.name}

Descripción:
${card.description}

Personalidad:
${card.personality}

Escenario:
${card.scenario}

${card.first_mes ? `Primer mensaje: ${card.first_mes}` : ''}
      `.trim();

      // Eliminar embeddings anteriores del NPC
      await client.deleteBySource('npc', npcId);

      // Asegurar que el namespace del NPC (y su jerarquía edificio/pueblo/mundo) exista
      const namespace = buildNamespace('npc', npcId);
      await namespaceManager.ensureNpcNamespace(npcId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: card.name,
          type: 'npc',
          name: card.name,
          description: card.description,
          personality: card.personality,
          scenario: card.scenario,
          location: npc.location
        },
        namespace,
        source_type: 'npc',
        source_id: npcId
      });

      console.log(`✅ Embeddings creados para NPC: ${npcId} (namespace: ${namespace})`);
    } catch (error) {
      console.error(`Error generando embeddings para NPC ${npcId}:`, error);
    }
  }

  /**
   * Genera embeddings automáticamente para una Sesión
   */
  static async embedSession(sessionId: string): Promise<void> {
    try {
      console.log(`🔄 Generando embeddings para sesión: ${sessionId}`);

      const session = sessionManager.getById(sessionId);
      if (!session) {
        console.warn(`Sesión no encontrada: ${sessionId}`);
        return;
      }

      const client = getEmbeddingClient();

      // Preparar contenido del resumen de la sesión
      const content = session.summary ? `
Resumen de sesión:
${session.summary}

NPC ID: ${session.npcId}
Jugador ID: ${session.playerId || 'Desconocido'}

Mensajes intercambiados: ${session.messages.length}
      `.trim() : '';

      if (!content) {
        console.log(`⏭️  Sesión ${sessionId} no tiene resumen, saltando embeddings`);
        return;
      }

      // Eliminar embeddings anteriores de la sesión
      await client.deleteBySource('session', sessionId);

      // Asegurar que el namespace de la sesión (y su NPC padre) exista
      const namespace = buildNamespace('sesion', sessionId);
      await namespaceManager.ensureSessionNamespace(sessionId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: `Sesión con NPC ${session.npcId}`,
          type: 'session',
          npcId: session.npcId,
          playerId: session.playerId,
          messagesCount: session.messages.length,
          summary: session.summary
        },
        namespace,
        source_type: 'session',
        source_id: sessionId
      });

      console.log(`✅ Embeddings creados para sesión: ${sessionId} (namespace: ${namespace})`);
    } catch (error) {
      console.error(`Error generando embeddings para sesión ${sessionId}:`, error);
    }
  }

  /**
   * Busca contexto relevante de embeddings para una consulta
   * Usa la configuración persistente para threshold y maxResults
   *
   * Si se pasa `namespaces` (array), busca en cada uno secuencialmente y
   * combina los resultados. Útil para búsqueda jerárquica
   * (sesión → NPC → edificio → pueblo → mundo).
   */
  static async searchContext(query: string, options?: {
    namespace?: string;
    namespaces?: string[]; // búsqueda jerárquica
    source_type?: string;
    limit?: number;
    threshold?: number;
  }): Promise<string> {
    try {
      const client = getEmbeddingClient();

      // Usar valores de la configuración persistente si no se especifican
      const threshold = options?.threshold ?? getSimilarityThreshold();
      const limit = options?.limit ?? getMaxResults();

      // Si se pasa array de namespaces, buscar en cada uno y combinar
      if (options?.namespaces && options.namespaces.length > 0) {
        const allResults: any[] = [];
        const seenIds = new Set<string>();

        // Buscar en cada namespace de la jerarquía
        // Limitamos cada búsqueda individual para no exceder el total deseado
        const perNamespaceLimit = Math.max(1, Math.ceil(limit / options.namespaces.length));

        for (const ns of options.namespaces) {
          try {
            const nsResults = await client.searchSimilar({
              query,
              namespace: ns,
              limit: perNamespaceLimit,
              threshold,
            });
            for (const r of nsResults) {
              if (!seenIds.has(r.id)) {
                seenIds.add(r.id);
                allResults.push(r);
              }
            }
          } catch (nsErr: any) {
            console.warn(`[searchContext] Error buscando en namespace ${ns}:`, nsErr?.message);
          }
        }

        // Ordenar por similitud y limitar al total
        allResults.sort((a, b) => b.similarity - a.similarity);
        const finalResults = allResults.slice(0, limit);

        if (finalResults.length === 0) {
          return '';
        }

        const context = finalResults.map((result, index) => {
          const metadata = result.metadata;
          const title = metadata.title || `Documento ${index + 1}`;
          return `• ${title}\n  ${result.content}`;
        }).join('\n\n');

        console.log(`[EmbeddingTriggers] Búsqueda jerárquica en ${options.namespaces.length} namespaces: ${finalResults.length} contextos relevantes`);
        return context;
      }

      // Búsqueda simple (un namespace o todos)
      const results = await client.searchSimilar({
        query,
        namespace: options?.namespace,
        source_type: options?.source_type,
        limit,
        threshold
      });

      if (results.length === 0) {
        return '';
      }

      // Formatear resultados como contexto
      const context = results.map((result, index) => {
        const metadata = result.metadata;
        const title = metadata.title || `Documento ${index + 1}`;
        return `• ${title}\n  ${result.content}`;
      }).join('\n\n');

      console.log(`[EmbeddingTriggers] Encontrados ${results.length} contextos relevantes (threshold=${threshold}, limit=${limit})`);
      return context;
    } catch (error) {
      console.error('Error buscando contexto de embeddings:', error);
      return '';
    }
  }

  /**
   * Busca contexto en la jerarquía completa de una entidad.
   * Ej: para una sesión, busca en sesion:{id} → npc:{npcId} → edificio/pueblo/mundo.
   *
   * @param entityType Tipo de entidad desde donde se inicia la búsqueda
   * @param entityId ID de la entidad
   * @param query Texto de consulta (mensaje del jugador, etc.)
   */
  static async searchContextInHierarchy(
    entityType: EntityType,
    entityId: string,
    query: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<string> {
    // Asegurar que toda la jerarquía tenga namespaces
    try {
      await namespaceManager.ensureForEntity(entityType, entityId);
    } catch (e: any) {
      console.warn(`[searchContextInHierarchy] No se pudo asegurar namespace para ${entityType}:${entityId}:`, e?.message);
    }

    // Obtener jerarquía (del más específico al más general)
    const hierarchy = await namespaceManager.getNamespaceHierarchy(entityType, entityId);
    console.log(`[searchContextInHierarchy] Jerarquía para ${entityType}:${entityId}:`, hierarchy);

    return this.searchContext(query, {
      namespaces: hierarchy,
      limit: options?.limit ?? getMaxResults(),
      threshold: options?.threshold ?? getSimilarityThreshold(),
    });
  }

  /**
   * Busca contexto relevante de embeddings optimizado para CHAT.
   * Solo busca en los namespaces de: sesión → NPC → edificio.
   * No busca en pueblo ni mundo (más eficiente y relevante para el contexto inmediato).
   *
   * @param entityType 'sesion' o 'npc' (punto de partida)
   * @param entityId ID de la entidad
   * @param query Mensaje del jugador
   */
  static async searchContextForChat(
    entityType: EntityType,
    entityId: string,
    query: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<string> {
    // Asegurar que la jerarquía de chat tenga namespaces
    try {
      await namespaceManager.ensureForEntity(entityType, entityId);
    } catch (e: any) {
      console.warn(`[searchContextForChat] No se pudo asegurar namespace para ${entityType}:${entityId}:`, e?.message);
    }

    // Obtener jerarquía optimizada para chat (solo sesión + NPC + edificio)
    const chatHierarchy = await namespaceManager.getChatHierarchy(entityType, entityId);
    console.log(`[searchContextForChat] Jerarquía de chat para ${entityType}:${entityId}:`, chatHierarchy);

    return this.searchContext(query, {
      namespaces: chatHierarchy,
      limit: options?.limit ?? getMaxResults(),
      threshold: options?.threshold ?? getSimilarityThreshold(),
    });
  }

  /**
   * Genera embeddings para todos los recursos de un tipo
   */
  static async embedAllResources(type: 'worlds' | 'pueblos' | 'edificios' | 'npcs' | 'sessions'): Promise<void> {
    console.log(`🔄 Generando embeddings para todos los ${type}...`);

    try {
      switch (type) {
        case 'worlds':
          const worlds = worldManager.getAll();
          for (const world of worlds) {
            await this.embedWorld(world.id);
          }
          break;

        case 'pueblos':
          const pueblos = puebloManager.getAll();
          for (const pueblo of pueblos) {
            await this.embedPueblo(pueblo.id);
          }
          break;

        case 'edificios':
          const edificios = edificioManager.getAll();
          for (const edificio of edificios) {
            await this.embedEdificio(edificio.id);
          }
          break;

        case 'npcs':
          const npcs = npcManager.getAll();
          for (const npc of npcs) {
            await this.embedNPC(npc.id);
          }
          break;

        case 'sessions':
          const sessions = sessionManager.getAll();
          for (const session of sessions) {
            await this.embedSession(session.id);
          }
          break;
      }

      console.log(`✅ Embeddings generados para todos los ${type}`);
    } catch (error) {
      console.error(`Error generando embeddings para ${type}:`, error);
    }
  }
}

export default EmbeddingTriggers;

/**
 * Servicio de Triggers Automáticos de Embeddings
 *
 * Este servicio gestiona la creación automática de embeddings
 * cuando se crean o actualizan recursos en el sistema.
 */

import { getEmbeddingClient } from './embeddings/client';
import { worldManager, puebloManager, edificioManager, npcManager, sessionManager } from './fileManager';

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
${world.lore.estado_mundo}

Rumores:
${world.lore.rumores.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      `.trim();

      // Eliminar embeddings anteriores del mundo
      await client.deleteBySource('world', worldId);

      // Crear nuevo embedding
      await client.createEmbedding({
        content,
        metadata: {
          title: world.name,
          type: 'world',
          name: world.name,
          estado_mundo: world.lore.estado_mundo,
          rumores: world.lore.rumores
        },
        namespace: 'worlds',
        source_type: 'world',
        source_id: worldId
      });

      console.log(`✅ Embeddings creados para mundo: ${worldId}`);
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

Estado:
${pueblo.lore.estado_pueblo}

Rumores:
${pueblo.lore.rumores.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      `.trim();

      // Eliminar embeddings anteriores del pueblo
      await client.deleteBySource('pueblo', puebloId);

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
        namespace: 'pueblos',
        source_type: 'pueblo',
        source_id: puebloId
      });

      console.log(`✅ Embeddings creados para pueblo: ${puebloId}`);
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

Lore:
${edificio.lore}

Eventos recientes:
${edificio.eventos_recientes.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Ubicación:
Desde (${edificio.area.start.x}, ${edificio.area.start.y}, ${edificio.area.start.z})
hasta (${edificio.area.end.x}, ${edificio.area.end.y}, ${edificio.area.end.z})
      `.trim();

      // Eliminar embeddings anteriores del edificio
      await client.deleteBySource('edificio', edificioId);

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
        namespace: 'edificios',
        source_type: 'edificio',
        source_id: edificioId
      });

      console.log(`✅ Embeddings creados para edificio: ${edificioId}`);
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
        namespace: 'npcs',
        source_type: 'npc',
        source_id: npcId
      });

      console.log(`✅ Embeddings creados para NPC: ${npcId}`);
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
        namespace: 'sessions',
        source_type: 'session',
        source_id: sessionId
      });

      console.log(`✅ Embeddings creados para sesión: ${sessionId}`);
    } catch (error) {
      console.error(`Error generando embeddings para sesión ${sessionId}:`, error);
    }
  }

  /**
   * Busca contexto relevante de embeddings para una consulta
   */
  static async searchContext(query: string, options?: {
    namespace?: string;
    source_type?: string;
    limit?: number;
    threshold?: number;
  }): Promise<string> {
    try {
      const client = getEmbeddingClient();

      const results = await client.searchSimilar({
        query,
        namespace: options?.namespace,
        source_type: options?.source_type,
        limit: options?.limit || 5,
        threshold: options?.threshold || 0.7
      });

      if (results.length === 0) {
        return '';
      }

      // Formatear resultados como contexto
      const context = results.map((result, index) => {
        const metadata = result.metadata;
        const title = metadata.title || `Documento ${index + 1}`;
        const similarity = (result.similarity * 100).toFixed(1);

        return `
[Contexto ${index + 1}] - ${title} (${similarity}% similar)
${result.content}
        `.trim();
      }).join('\n\n---\n\n');

      return context;
    } catch (error) {
      console.error('Error buscando contexto de embeddings:', error);
      return '';
    }
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

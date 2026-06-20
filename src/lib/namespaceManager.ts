/**
 * Namespace Manager
 * =================
 * Sistema de namespaces por entidad: cada mundo/pueblo/edificio/NPC/sesión
 * tiene su propio namespace en LanceDB.
 *
 * Convención de nombres (jerárquica, filtrable por prefijo):
 *   - Mundo:    mundo:{worldId}
 *   - Pueblo:   pueblo:{puebloId}
 *   - Edificio: edificio:{edificioId}
 *   - NPC:      npc:{npcId}
 *   - Sesión:   sesion:{sessionId}
 *
 * Los namespaces se registran en la tabla `namespaces` de LanceDB con
 * metadata que incluye el entityType, entityId y relaciones jerárquicas.
 */

import { LanceDBWrapper } from './lancedb-db';
import { db } from './db';

// Tipos de entidad soportados
export type EntityType = 'mundo' | 'pueblo' | 'edificio' | 'npc' | 'sesion';

export interface NamespaceInfo {
  namespace: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  // Relaciones jerárquicas (para búsquedas escalonadas)
  parentNamespace?: string;   // ej: NPC -> su edificio/pueblo/mundo
  relatedNamespaces?: string[]; // ej: sesión -> su NPC
  exists: boolean;            // si está registrado en tabla namespaces
  embeddingsCount: number;    // cuántos embeddings tiene en la tabla embeddings
}

export interface VerifyResult {
  totalEntities: number;
  verified: number;
  created: number;
  errors: number;
  details: Array<{
    entityType: EntityType;
    entityId: string;
    entityName?: string;
    namespace: string;
    action: 'already_exists' | 'created' | 'error';
    error?: string;
  }>;
  // Namespaces huérfanos (su entidad ya no existe en la DB)
  orphanedNamespaces: Array<{
    namespace: string;
    entityType: EntityType;
    entityId: string;
    embeddingsCount: number;
    deleted: boolean; // true si se eliminó en esta verificación
    error?: string;
  }>;
  orphanedCount: number;
  orphanedDeleted: number;
  orphanedErrors: number;
}

// ============================================
// Helpers de nomenclatura
// ============================================

export function buildNamespace(entityType: EntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function parseNamespace(namespace: string): { entityType: EntityType; entityId: string } | null {
  const idx = namespace.indexOf(':');
  if (idx === -1) return null;
  const type = namespace.substring(0, idx) as EntityType;
  const id = namespace.substring(idx + 1);
  if (!['mundo', 'pueblo', 'edificio', 'npc', 'sesion'].includes(type)) return null;
  return { entityType: type, entityId: id };
}

// ============================================
// Manager
// ============================================

export const namespaceManager = {
  /**
   * Verifica si un namespace está registrado en la tabla `namespaces`.
   */
  async isRegistered(namespace: string): Promise<boolean> {
    try {
      const all = await LanceDBWrapper.getAllNamespaces();
      return all.some((n: any) => n.namespace === namespace);
    } catch {
      return false;
    }
  },

  /**
   * Cuenta cuántos embeddings hay en un namespace (en la tabla `embeddings`).
   */
  async countEmbeddings(namespace: string): Promise<number> {
    try {
      const stats = await LanceDBWrapper.getStats();
      return stats.embeddingsByNamespace[namespace] || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Asegura que un namespace exista en la tabla `namespaces`.
   * Si ya existe, no hace nada. Si no, lo crea con metadata.
   */
  async ensureNamespace(params: {
    namespace: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ created: boolean; namespace: string }> {
    const exists = await this.isRegistered(params.namespace);
    if (exists) {
      return { created: false, namespace: params.namespace };
    }

    await LanceDBWrapper.upsertNamespace({
      namespace: params.namespace,
      description: params.description,
      metadata: params.metadata || {},
    });

    console.log(`✅ Namespace creado: ${params.namespace}`);
    return { created: true, namespace: params.namespace };
  },

  /**
   * Asegura que el namespace de un MUNDO exista.
   */
  async ensureWorldNamespace(worldId: string): Promise<{ created: boolean; namespace: string }> {
    const world = await db.world.findUnique({ where: { id: worldId } });
    if (!world) {
      throw new Error(`Mundo no encontrado: ${worldId}`);
    }
    const namespace = buildNamespace('mundo', worldId);
    return this.ensureNamespace({
      namespace,
      description: `Mundo: ${world.name}`,
      metadata: { entityType: 'mundo', entityId: worldId, entityName: world.name },
    });
  },

  /**
   * Asegura que el namespace de un PUEBLO exista (y el de su mundo padre).
   */
  async ensurePuebloNamespace(puebloId: string): Promise<{ created: boolean; namespace: string; parentNamespace?: string }> {
    const pueblo = await db.pueblo.findUnique({ where: { id: puebloId } });
    if (!pueblo) {
      throw new Error(`Pueblo no encontrado: ${puebloId}`);
    }
    const namespace = buildNamespace('pueblo', puebloId);
    const result = await this.ensureNamespace({
      namespace,
      description: `${pueblo.type === 'nacion' ? 'Nación' : 'Pueblo'}: ${pueblo.name}`,
      metadata: {
        entityType: 'pueblo',
        entityId: puebloId,
        entityName: pueblo.name,
        worldId: pueblo.worldId,
        parentNamespace: buildNamespace('mundo', pueblo.worldId),
      },
    });
    // También asegurar el del mundo padre
    try {
      await this.ensureWorldNamespace(pueblo.worldId);
    } catch (e) {
      console.warn(`[ensurePuebloNamespace] No se pudo asegurar namespace del mundo padre:`, (e as Error).message);
    }
    return { ...result, parentNamespace: buildNamespace('mundo', pueblo.worldId) };
  },

  /**
   * Asegura que el namespace de un EDIFICIO exista (y los de su pueblo/mundo).
   */
  async ensureEdificioNamespace(edificioId: string): Promise<{ created: boolean; namespace: string; parentNamespace?: string }> {
    const edificio = await db.edificio.findUnique({ where: { id: edificioId } });
    if (!edificio) {
      throw new Error(`Edificio no encontrado: ${edificioId}`);
    }
    const namespace = buildNamespace('edificio', edificioId);
    const result = await this.ensureNamespace({
      namespace,
      description: `Edificio: ${edificio.name}`,
      metadata: {
        entityType: 'edificio',
        entityId: edificioId,
        entityName: edificio.name,
        puebloId: edificio.puebloId,
        worldId: edificio.worldId,
        parentNamespace: buildNamespace('pueblo', edificio.puebloId),
      },
    });
    // También asegurar pueblo y mundo padres
    try {
      await this.ensurePuebloNamespace(edificio.puebloId);
    } catch (e) {
      console.warn(`[ensureEdificioNamespace] No se pudo asegurar namespace del pueblo padre:`, (e as Error).message);
    }
    return { ...result, parentNamespace: buildNamespace('pueblo', edificio.puebloId) };
  },

  /**
   * Asegura que el namespace de un NPC exista (y los de su ubicación jerárquica).
   */
  async ensureNpcNamespace(npcId: string): Promise<{ created: boolean; namespace: string; parentNamespace?: string }> {
    const npc = await db.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      throw new Error(`NPC no encontrado: ${npcId}`);
    }
    const namespace = buildNamespace('npc', npcId);
    let parentNamespace: string | undefined;

    if (npc.edificioId) {
      parentNamespace = buildNamespace('edificio', npc.edificioId);
      try { await this.ensureEdificioNamespace(npc.edificioId); } catch (e) { console.warn(`[ensureNpcNamespace] edificio padre:`, (e as Error).message); }
    } else if (npc.puebloId) {
      parentNamespace = buildNamespace('pueblo', npc.puebloId);
      try { await this.ensurePuebloNamespace(npc.puebloId); } catch (e) { console.warn(`[ensureNpcNamespace] pueblo padre:`, (e as Error).message); }
    } else {
      parentNamespace = buildNamespace('mundo', npc.worldId);
      try { await this.ensureWorldNamespace(npc.worldId); } catch (e) { console.warn(`[ensureNpcNamespace] mundo padre:`, (e as Error).message); }
    }

    const result = await this.ensureNamespace({
      namespace,
      description: `NPC: ${npcId}`,
      metadata: {
        entityType: 'npc',
        entityId: npcId,
        locationScope: npc.locationScope,
        worldId: npc.worldId,
        puebloId: npc.puebloId,
        edificioId: npc.edificioId,
        parentNamespace,
      },
    });
    return { ...result, parentNamespace };
  },

  /**
   * Asegura que el namespace de una SESIÓN exista (y el de su NPC).
   */
  async ensureSessionNamespace(sessionId: string): Promise<{ created: boolean; namespace: string; parentNamespace?: string }> {
    const session = await db.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new Error(`Sesión no encontrada: ${sessionId}`);
    }
    const namespace = buildNamespace('sesion', sessionId);
    const parentNamespace = buildNamespace('npc', session.npcId);

    const result = await this.ensureNamespace({
      namespace,
      description: `Sesión ${sessionId} (NPC: ${session.npcId})`,
      metadata: {
        entityType: 'sesion',
        entityId: sessionId,
        npcId: session.npcId,
        playerId: session.playerId,
        parentNamespace,
      },
    });
    // También asegurar el NPC padre
    try {
      await this.ensureNpcNamespace(session.npcId);
    } catch (e) {
      console.warn(`[ensureSessionNamespace] No se pudo asegurar namespace del NPC padre:`, (e as Error).message);
    }
    return { ...result, parentNamespace };
  },

  /**
   * Asegura el namespace según el tipo de entidad.
   */
  async ensureForEntity(entityType: EntityType, entityId: string): Promise<{ created: boolean; namespace: string; parentNamespace?: string }> {
    switch (entityType) {
      case 'mundo': return this.ensureWorldNamespace(entityId);
      case 'pueblo': return this.ensurePuebloNamespace(entityId);
      case 'edificio': return this.ensureEdificioNamespace(entityId);
      case 'npc': return this.ensureNpcNamespace(entityId);
      case 'sesion': return this.ensureSessionNamespace(entityId);
      default: throw new Error(`Tipo de entidad no soportado: ${entityType}`);
    }
  },

  /**
   * Obtiene la jerarquía completa de namespaces para una entidad dada.
   * Útil para búsquedas escalonadas: sesión → NPC → edificio → pueblo → mundo.
   *
   * Retorna array ordenado del más específico al más general.
   */
  async getNamespaceHierarchy(entityType: EntityType, entityId: string): Promise<string[]> {
    const namespaces: string[] = [];

    if (entityType === 'sesion') {
      const session = await db.session.findUnique({ where: { id: entityId } });
      if (!session) return [buildNamespace('sesion', entityId)];
      namespaces.push(buildNamespace('sesion', entityId));
      // continuar con la jerarquía del NPC
      entityType = 'npc';
      entityId = session.npcId;
    }

    if (entityType === 'npc') {
      const npc = await db.nPC.findUnique({ where: { id: entityId } });
      if (!npc) return namespaces.length ? namespaces : [buildNamespace('npc', entityId)];
      namespaces.push(buildNamespace('npc', entityId));
      if (npc.edificioId) {
        namespaces.push(buildNamespace('edificio', npc.edificioId));
        entityType = 'edificio';
        entityId = npc.edificioId;
      } else if (npc.puebloId) {
        namespaces.push(buildNamespace('pueblo', npc.puebloId));
        entityType = 'pueblo';
        entityId = npc.puebloId;
      } else {
        namespaces.push(buildNamespace('mundo', npc.worldId));
        return namespaces;
      }
    }

    if (entityType === 'edificio') {
      const edificio = await db.edificio.findUnique({ where: { id: entityId } });
      if (!edificio) return namespaces;
      if (!namespaces.includes(buildNamespace('edificio', entityId))) {
        namespaces.push(buildNamespace('edificio', entityId));
      }
      namespaces.push(buildNamespace('pueblo', edificio.puebloId));
      entityType = 'pueblo';
      entityId = edificio.puebloId;
    }

    if (entityType === 'pueblo') {
      const pueblo = await db.pueblo.findUnique({ where: { id: entityId } });
      if (!pueblo) return namespaces;
      if (!namespaces.includes(buildNamespace('pueblo', entityId))) {
        namespaces.push(buildNamespace('pueblo', entityId));
      }
      namespaces.push(buildNamespace('mundo', pueblo.worldId));
    }

    return namespaces;
  },

  /**
   * Obtiene la jerarquía de namespaces optimizada para CHAT.
   * Solo incluye: sesión → NPC → edificio (NO pueblo ni mundo).
   * Esto hace la búsqueda de embeddings más eficiente y relevante
   * para el contexto inmediato del chat.
   *
   * @param entityType 'sesion' o 'npc' (punto de partida)
   * @param entityId ID de la entidad
   * @returns Array de namespaces del más específico al más general (máximo 3)
   */
  async getChatHierarchy(entityType: EntityType, entityId: string): Promise<string[]> {
    const namespaces: string[] = [];

    if (entityType === 'sesion') {
      const session = await db.session.findUnique({ where: { id: entityId } });
      if (!session) return [buildNamespace('sesion', entityId)];
      namespaces.push(buildNamespace('sesion', entityId));
      entityType = 'npc';
      entityId = session.npcId;
    }

    if (entityType === 'npc') {
      const npc = await db.nPC.findUnique({ where: { id: entityId } });
      if (!npc) return namespaces.length ? namespaces : [buildNamespace('npc', entityId)];
      namespaces.push(buildNamespace('npc', entityId));
      if (npc.edificioId) {
        namespaces.push(buildNamespace('edificio', npc.edificioId));
      }
      // NO incluimos pueblo ni mundo — solo sesión + NPC + edificio
    }

    return namespaces;
  },

  /**
   * VERIFICACIÓN COMPLETA: recorre todos los mundos, pueblos, edificios,
   * NPCs y sesiones de la DB y asegura que cada uno tenga su namespace.
   *
   * @returns Reporte detallado con totales, creados y errores.
   */
  async verifyAll(): Promise<VerifyResult> {
    const details: VerifyResult['details'] = [];
    let created = 0;
    let errors = 0;
    let verified = 0;
    let totalEntities = 0;

    // 1. Mundos
    const worlds = await db.world.findMany();
    for (const w of worlds) {
      totalEntities++;
      try {
        const r = await this.ensureWorldNamespace(w.id);
        if (r.created) created++;
        else verified++;
        details.push({
          entityType: 'mundo',
          entityId: w.id,
          entityName: w.name,
          namespace: r.namespace,
          action: r.created ? 'created' : 'already_exists',
        });
      } catch (e: any) {
        errors++;
        details.push({
          entityType: 'mundo',
          entityId: w.id,
          entityName: w.name,
          namespace: buildNamespace('mundo', w.id),
          action: 'error',
          error: e.message,
        });
      }
    }

    // 2. Pueblos
    const pueblos = await db.pueblo.findMany();
    for (const p of pueblos) {
      totalEntities++;
      try {
        const r = await this.ensurePuebloNamespace(p.id);
        if (r.created) created++;
        else verified++;
        details.push({
          entityType: 'pueblo',
          entityId: p.id,
          entityName: p.name,
          namespace: r.namespace,
          action: r.created ? 'created' : 'already_exists',
        });
      } catch (e: any) {
        errors++;
        details.push({
          entityType: 'pueblo',
          entityId: p.id,
          entityName: p.name,
          namespace: buildNamespace('pueblo', p.id),
          action: 'error',
          error: e.message,
        });
      }
    }

    // 3. Edificios
    const edificios = await db.edificio.findMany();
    for (const e of edificios) {
      totalEntities++;
      try {
        const r = await this.ensureEdificioNamespace(e.id);
        if (r.created) created++;
        else verified++;
        details.push({
          entityType: 'edificio',
          entityId: e.id,
          entityName: e.name,
          namespace: r.namespace,
          action: r.created ? 'created' : 'already_exists',
        });
      } catch (err: any) {
        errors++;
        details.push({
          entityType: 'edificio',
          entityId: e.id,
          entityName: e.name,
          namespace: buildNamespace('edificio', e.id),
          action: 'error',
          error: err.message,
        });
      }
    }

    // 4. NPCs
    const npcs = await db.nPC.findMany();
    for (const n of npcs) {
      totalEntities++;
      try {
        const r = await this.ensureNpcNamespace(n.id);
        if (r.created) created++;
        else verified++;
        details.push({
          entityType: 'npc',
          entityId: n.id,
          namespace: r.namespace,
          action: r.created ? 'created' : 'already_exists',
        });
      } catch (err: any) {
        errors++;
        details.push({
          entityType: 'npc',
          entityId: n.id,
          namespace: buildNamespace('npc', n.id),
          action: 'error',
          error: err.message,
        });
      }
    }

    // 5. Sesiones
    const sessions = await db.session.findMany();
    for (const s of sessions) {
      totalEntities++;
      try {
        const r = await this.ensureSessionNamespace(s.id);
        if (r.created) created++;
        else verified++;
        details.push({
          entityType: 'sesion',
          entityId: s.id,
          namespace: r.namespace,
          action: r.created ? 'created' : 'already_exists',
        });
      } catch (err: any) {
        errors++;
        details.push({
          entityType: 'sesion',
          entityId: s.id,
          namespace: buildNamespace('sesion', s.id),
          action: 'error',
          error: err.message,
        });
      }
    }

    // ============================================
    // DETECCIÓN DE NAMESPACES HUÉRFANOS
    // ============================================
    // Un namespace es huérfano si su entidad (mundo/pueblo/edificio/NPC/sesión)
    // ya no existe en la DB. Esto puede pasar si se eliminó la entidad sin limpiar
    // su namespace, o si el namespace se creó manualmente con la convención {tipo}:{id}.
    const orphanedNamespaces: VerifyResult['orphanedNamespaces'] = [];

    try {
      const allNs = await LanceDBWrapper.getAllNamespaces();
      const stats = await LanceDBWrapper.getStats();

      // Cargar todos los IDs existentes en la DB para comparar
      const existingIds = {
        mundo: new Set((await db.world.findMany({ select: { id: true } })).map((w: any) => w.id)),
        pueblo: new Set((await db.pueblo.findMany({ select: { id: true } })).map((p: any) => p.id)),
        edificio: new Set((await db.edificio.findMany({ select: { id: true } })).map((e: any) => e.id)),
        npc: new Set((await db.nPC.findMany({ select: { id: true } })).map((n: any) => n.id)),
        sesion: new Set((await db.session.findMany({ select: { id: true } })).map((s: any) => s.id)),
      };

      for (const nsRecord of allNs) {
        const parsed = parseNamespace(nsRecord.namespace);
        if (!parsed) continue; // namespace con formato no reconocido (ej: 'default', 'Economia')

        const { entityType, entityId } = parsed;
        const exists = existingIds[entityType]?.has(entityId) ?? false;

        if (!exists) {
          // Es huérfano: la entidad no existe en la DB
          orphanedNamespaces.push({
            namespace: nsRecord.namespace,
            entityType,
            entityId,
            embeddingsCount: stats.embeddingsByNamespace[nsRecord.namespace] || 0,
            deleted: false,
          });
        }
      }

      console.log(
        `[namespaceManager] Detectados ${orphanedNamespaces.length} namespace(s) huérfano(s)`
      );
    } catch (orphanErr: any) {
      console.error('[namespaceManager] Error detectando huérfanos:', orphanErr?.message);
    }

    return {
      totalEntities,
      verified,
      created,
      errors,
      details,
      orphanedNamespaces,
      orphanedCount: orphanedNamespaces.length,
      orphanedDeleted: 0,
      orphanedErrors: 0,
    };
  },

  /**
   * Elimina el namespace de una entidad (tabla namespaces + embeddings asociados).
   * Útil para llamar cuando se elimina una entidad de la DB.
   */
  async deleteEntityNamespace(entityType: EntityType, entityId: string): Promise<{ deleted: boolean; namespace: string; embeddingsDeleted: number }> {
    const namespace = buildNamespace(entityType, entityId);
    let embeddingsDeleted = 0;

    try {
      // 1. Eliminar embeddings del namespace (de la tabla 'embeddings')
      try {
        const table = await LanceDBWrapper.getEmbeddingsTable();
        // Filtrar por namespace y eliminar
        // LanceDB soporta delete con filtro WHERE
        await table.delete(`namespace = '${namespace}'`);
        embeddingsDeleted = 1; // LanceDB delete no retorna count, marcamos como éxito
        console.log(`[deleteEntityNamespace] Embeddings eliminados del namespace "${namespace}"`);
      } catch (embErr: any) {
        console.warn(`[deleteEntityNamespace] Error eliminando embeddings:`, embErr?.message);
      }

      // 2. Eliminar el registro de la tabla 'namespaces'
      try {
        await LanceDBWrapper.deleteNamespace(namespace);
        console.log(`[deleteEntityNamespace] Namespace "${namespace}" eliminado de la tabla namespaces`);
      } catch (nsErr: any) {
        console.warn(`[deleteEntityNamespace] Error eliminando registro de namespace:`, nsErr?.message);
      }

      return { deleted: true, namespace, embeddingsDeleted };
    } catch (error: any) {
      console.error(`[deleteEntityNamespace] Error eliminando namespace "${namespace}":`, error?.message);
      return { deleted: false, namespace, embeddingsDeleted: 0 };
    }
  },

  /**
   * Elimina namespaces huérfanos (cuya entidad ya no existe en la DB).
   * @param orphans Lista de namespaces huérfanos a eliminar (de findOrphanedNamespaces)
   * @returns Lista con el resultado de cada eliminación
   */
  async cleanOrphanedNamespaces(orphans?: Array<{ namespace: string; entityType: EntityType; entityId: string }>): Promise<Array<{ namespace: string; deleted: boolean; error?: string }>> {
    // Si no se pasa la lista, detectar automáticamente
    let toClean = orphans;
    if (!toClean) {
      const verifyResult = await this.verifyAll();
      toClean = verifyResult.orphanedNamespaces.map((o) => ({
        namespace: o.namespace,
        entityType: o.entityType,
        entityId: o.entityId,
      }));
    }

    const results: Array<{ namespace: string; deleted: boolean; error?: string }> = [];

    for (const orphan of toClean) {
      try {
        // Eliminar embeddings del namespace
        try {
          const table = await LanceDBWrapper.getEmbeddingsTable();
          await table.delete(`namespace = '${orphan.namespace}'`);
        } catch (embErr: any) {
          console.warn(`[cleanOrphanedNamespaces] Error eliminando embeddings de "${orphan.namespace}":`, embErr?.message);
        }

        // Eliminar registro de la tabla namespaces
        try {
          await LanceDBWrapper.deleteNamespace(orphan.namespace);
        } catch (nsErr: any) {
          // No es crítico si no existe en la tabla namespaces
        }

        results.push({ namespace: orphan.namespace, deleted: true });
        console.log(`[cleanOrphanedNamespaces] Namespace huérfano eliminado: "${orphan.namespace}"`);
      } catch (error: any) {
        results.push({ namespace: orphan.namespace, deleted: false, error: error?.message });
        console.error(`[cleanOrphanedNamespaces] Error eliminando "${orphan.namespace}":`, error?.message);
      }
    }

    return results;
  },

  /**
   * Lista todos los namespaces registrados agrupados por tipo de entidad.
   */
  async listAllByType(): Promise<Record<EntityType, NamespaceInfo[]>> {
    const all = await LanceDBWrapper.getAllNamespaces();
    const stats = await LanceDBWrapper.getStats();

    const grouped: Record<EntityType, NamespaceInfo[]> = {
      mundo: [],
      pueblo: [],
      edificio: [],
      npc: [],
      sesion: [],
    };

    for (const ns of all) {
      const parsed = parseNamespace(ns.namespace);
      if (!parsed) continue;

      grouped[parsed.entityType].push({
        namespace: ns.namespace,
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        entityName: ns.metadata?.entityName,
        parentNamespace: ns.metadata?.parentNamespace,
        exists: true,
        embeddingsCount: stats.embeddingsByNamespace[ns.namespace] || 0,
      });
    }

    return grouped;
  },
};

export default namespaceManager;

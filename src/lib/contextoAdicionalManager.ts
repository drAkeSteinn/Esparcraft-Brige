/**
 * Contexto Adicional Manager
 * ==========================
 * Sistema de contextos adicionales temporales.
 * Permite que una entidad (NPC, edificio, pueblo, mundo) tenga acceso
 * temporal a los namespaces de otra entidad, como si la hubiera "visitado".
 *
 * Ejemplo:
 *   NPC A "visita" edificio X → NPC A tiene acceso al namespace de edificio X
 *   durante N días. Cuando expira, pierde ese acceso.
 *
 * Cascading (1 nivel):
 *   - Si visitas un edificio → heredas los contextos de los NPCs en ese edificio
 *   - Si visitas un pueblo → heredas los contextos de los edificios en ese pueblo
 *   - Si visitas un mundo → heredas los contextos de los pueblos en ese mundo
 */

import { db } from './db';
import { buildNamespace, type EntityType } from './namespaceManager';

export type ContextoEntityType = 'npc' | 'edificio' | 'pueblo' | 'mundo';

export interface ContextoAdicional {
  id: string;
  entityType: ContextoEntityType;
  entityId: string;
  targetType: ContextoEntityType;
  targetId: string;
  durationDays: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

function toDomain(c: any): ContextoAdicional {
  return {
    id: c.id,
    entityType: c.entityType as ContextoEntityType,
    entityId: c.entityId,
    targetType: c.targetType as ContextoEntityType,
    targetId: c.targetId,
    durationDays: c.durationDays,
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Mapear 'nacion' → 'pueblo' para compatibilidad con el payload
export function normalizeEntityType(type: string): ContextoEntityType {
  if (type === 'nacion') return 'pueblo';
  if (['npc', 'edificio', 'pueblo', 'mundo'].includes(type)) return type as ContextoEntityType;
  throw new Error(`Tipo de entidad inválido: ${type}. Debe ser npc, edificio, pueblo, nacion o mundo.`);
}

export const contextoAdicionalManager = {
  /**
   * Crea o actualiza un contexto adicional.
   * Si ya existe (misma entidad + mismo target), actualiza la duración.
   */
  async upsert(params: {
    entityType: ContextoEntityType;
    entityId: string;
    targetType: ContextoEntityType;
    targetId: string;
    durationDays: number;
  }): Promise<ContextoAdicional> {
    const { entityType, entityId, targetType, targetId, durationDays } = params;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Buscar si ya existe
    const existing = await db.contextoAdicional.findUnique({
      where: {
        entityType_entityId_targetType_targetId: {
          entityType, entityId, targetType, targetId,
        },
      },
    });

    if (existing) {
      // Actualizar duración (extender desde ahora)
      const updated = await db.contextoAdicional.update({
        where: { id: existing.id },
        data: { durationDays, expiresAt, updatedAt: now },
      });
      console.log(`[contextoAdicionalManager] Contexto actualizado: ${entityType}:${entityId} → ${targetType}:${targetId} (duración: ${durationDays} días, expira: ${expiresAt.toISOString()})`);
      return toDomain(updated);
    }

    // Crear nuevo
    const created = await db.contextoAdicional.create({
      data: { entityType, entityId, targetType, targetId, durationDays, expiresAt },
    });
    console.log(`[contextoAdicionalManager] Contexto creado: ${entityType}:${entityId} → ${targetType}:${targetId} (duración: ${durationDays} días, expira: ${expiresAt.toISOString()})`);
    return toDomain(created);
  },

  /**
   * Obtiene todos los contextos adicionales activos (no expirados) de una entidad.
   */
  async getActive(entityType: ContextoEntityType, entityId: string): Promise<ContextoAdicional[]> {
    const now = new Date();
    const result = await db.contextoAdicional.findMany({
      where: {
        entityType,
        entityId,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });
    return result.map(toDomain);
  },

  /**
   * Obtiene todos los contextos adicionales de una entidad (incluyendo expirados).
   */
  async getAll(entityType: ContextoEntityType, entityId: string): Promise<ContextoAdicional[]> {
    const result = await db.contextoAdicional.findMany({
      where: { entityType, entityId },
      orderBy: { expiresAt: 'desc' },
    });
    return result.map(toDomain);
  },

  /**
   * Elimina un contexto adicional por ID.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.contextoAdicional.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Elimina todos los contextos adicionales expirados.
   * @returns número de contextos eliminados
   */
  async cleanExpired(): Promise<number> {
    const now = new Date();
    const result = await db.contextoAdicional.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    console.log(`[contextoAdicionalManager] Contextos expirados eliminados: ${result.count}`);
    return result.count;
  },

  /**
   * Obtiene los namespaces adicionales que una entidad debería buscar
   * durante el chat, incluyendo cascading de 1 nivel.
   *
   * Ejemplo: si un NPC visita un edificio, busca en el namespace de ese edificio.
   * Si ese edificio tiene NPCs con contextos adicionales (ej: uno de ellos visitó
   * un pueblo), el NPC también hereda el namespace de ese pueblo (cascading 1 nivel).
   *
   * @returns Array de namespaces adicionales para buscar en el chat
   */
  async getAdditionalNamespaces(entityType: ContextoEntityType, entityId: string): Promise<string[]> {
    const contexts = await this.getActive(entityType, entityId);
    if (contexts.length === 0) return [];

    const additionalNamespaces: string[] = [];

    for (const ctx of contexts) {
      // Namespace directo del target
      const targetNs = buildNamespace(ctx.targetType as EntityType, ctx.targetId);
      if (!additionalNamespaces.includes(targetNs)) {
        additionalNamespaces.push(targetNs);
      }

      // CASCADING (1 nivel): buscar contextos adicionales de entidades dentro del target
      const cascadingNamespaces = await this.getCascadingNamespaces(ctx.targetType, ctx.targetId);
      for (const ns of cascadingNamespaces) {
        if (!additionalNamespaces.includes(ns)) {
          additionalNamespaces.push(ns);
        }
      }
    }

    console.log(`[contextoAdicionalManager] Namespaces adicionales para ${entityType}:${entityId}:`, additionalNamespaces);
    return additionalNamespaces;
  },

  /**
   * Obtiene namespaces heredados via cascading desde el target.
   * Si el target es un edificio, busca contextos de NPCs en ese edificio.
   * Si el target es un pueblo, busca contextos de edificios en ese pueblo.
   * Si el target es un mundo, busca contextos de pueblos en ese mundo.
   */
  async getCascadingNamespaces(targetType: ContextoEntityType, targetId: string): Promise<string[]> {
    const namespaces: string[] = [];

    try {
      if (targetType === 'edificio') {
        // Buscar NPCs en este edificio que tengan contextos adicionales activos
        const npcs = await db.nPC.findMany({ where: { edificioId: targetId }, select: { id: true } });
        for (const npc of npcs) {
          const npcContexts = await this.getActive('npc', npc.id);
          for (const ctx of npcContexts) {
            // Solo heredar contextos que NO sean del mismo edificio (evitar circular)
            if (!(ctx.targetType === 'edificio' && ctx.targetId === targetId)) {
              const ns = buildNamespace(ctx.targetType as EntityType, ctx.targetId);
              if (!namespaces.includes(ns)) namespaces.push(ns);
            }
          }
        }
      } else if (targetType === 'pueblo') {
        // Buscar edificios en este pueblo que tengan contextos adicionales activos
        const edificios = await db.edificio.findMany({ where: { puebloId: targetId }, select: { id: true } });
        for (const edificio of edificios) {
          const edContexts = await this.getActive('edificio', edificio.id);
          for (const ctx of edContexts) {
            if (!(ctx.targetType === 'pueblo' && ctx.targetId === targetId)) {
              const ns = buildNamespace(ctx.targetType as EntityType, ctx.targetId);
              if (!namespaces.includes(ns)) namespaces.push(ns);
            }
          }
        }
      } else if (targetType === 'mundo') {
        // Buscar pueblos en este mundo que tengan contextos adicionales activos
        const pueblos = await db.pueblo.findMany({ where: { worldId: targetId }, select: { id: true } });
        for (const pueblo of pueblos) {
          const pContexts = await this.getActive('pueblo', pueblo.id);
          for (const ctx of pContexts) {
            if (!(ctx.targetType === 'mundo' && ctx.targetId === targetId)) {
              const ns = buildNamespace(ctx.targetType as EntityType, ctx.targetId);
              if (!namespaces.includes(ns)) namespaces.push(ns);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[contextoAdicionalManager] Error en cascading:`, error);
    }

    return namespaces;
  },
};

export default contextoAdicionalManager;

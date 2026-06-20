import { db } from '@/lib/db';
import { NPCAction, NPCActionInput } from './types';
import type { ToolDefinition } from './llm/types';

function toDomain(a: any): NPCAction {
  return {
    id: a.id,
    npcId: a.npcId,
    name: a.name,
    key: a.key,
    description: a.description,
    parameters: a.parameters ? JSON.parse(a.parameters) : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

const KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isValidActionKey(key: string): boolean {
  return KEY_REGEX.test(key);
}

export const npcActionManager = {
  async getByNpcId(npcId: string): Promise<NPCAction[]> {
    const actions = await db.nPCAction.findMany({
      where: { npcId },
      orderBy: [{ name: 'asc' }],
    });
    return actions.map(toDomain);
  },

  async create(npcId: string, input: NPCActionInput): Promise<NPCAction> {
    if (!isValidActionKey(input.key)) {
      throw new Error(`Key inválida: "${input.key}". Solo se permiten letras, números y underscore.`);
    }

    const npc = await db.nPC.findUnique({ where: { id: npcId } });
    if (!npc) throw new Error(`NPC no encontrado: ${npcId}`);

    const existing = await db.nPCAction.findUnique({
      where: { npcId_key: { npcId, key: input.key } },
    });
    if (existing) {
      throw new Error(`El NPC ya tiene una acción con la key "${input.key}".`);
    }

    const created = await db.nPCAction.create({
      data: {
        npcId,
        name: input.name,
        key: input.key,
        description: input.description,
        parameters: input.parameters ? JSON.stringify(input.parameters) : null,
      },
    });
    return toDomain(created);
  },

  async update(id: string, input: NPCActionInput): Promise<NPCAction | null> {
    if (!isValidActionKey(input.key)) {
      throw new Error(`Key inválida: "${input.key}".`);
    }

    const existing = await db.nPCAction.findUnique({ where: { id } });
    if (!existing) return null;

    if (existing.key !== input.key) {
      const conflict = await db.nPCAction.findUnique({
        where: { npcId_key: { npcId: existing.npcId, key: input.key } },
      });
      if (conflict) throw new Error(`El NPC ya tiene otra acción con la key "${input.key}".`);
    }

    const updated = await db.nPCAction.update({
      where: { id },
      data: {
        name: input.name,
        key: input.key,
        description: input.description,
        parameters: input.parameters ? JSON.stringify(input.parameters) : null,
      },
    });
    return toDomain(updated);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.nPCAction.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteAllByNpc(npcId: string): Promise<number> {
    const result = await db.nPCAction.deleteMany({ where: { npcId } });
    return result.count;
  },

  /**
   * Convierte las acciones de un NPC al formato ToolDefinition
   * para enviar al LLM via tool calling.
   */
  async getActionsAsTools(npcId: string): Promise<ToolDefinition[]> {
    const actions = await this.getByNpcId(npcId);
    return actions.map(a => ({
      type: 'function' as const,
      function: {
        name: a.key,
        description: a.description,
        parameters: a.parameters || { type: 'object', properties: {} },
      },
    }));
  },

  /**
   * Verifica si un NPC tiene acciones definidas.
   */
  async hasActions(npcId: string): Promise<boolean> {
    const count = await db.nPCAction.count({ where: { npcId } });
    return count > 0;
  },
};

export default npcActionManager;

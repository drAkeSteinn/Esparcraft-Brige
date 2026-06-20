import { db } from '@/lib/db';
import {
  AttributeTemplate,
  AttributeTemplateInput,
  AttributeType,
  NPCAttribute,
  NPCAttributeInput,
  formatAttributeValue,
} from './types';

// ============================================================
// Helpers de conversión DB <-> Dominio
// ============================================================

function toDomainTemplate(t: any): AttributeTemplate {
  return {
    id: t.id,
    name: t.name,
    key: t.key,
    type: t.type as AttributeType,
    minValue: t.minValue ?? null,
    maxValue: t.maxValue ?? null,
    defaultValue: t.defaultValue ?? null,
    description: t.description ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toDomainNPCAttribute(a: any): NPCAttribute {
  return {
    id: a.id,
    npcId: a.npcId,
    name: a.name,
    key: a.key,
    type: a.type as AttributeType,
    valueText: a.valueText ?? null,
    valueNumber: a.valueNumber ?? null,
    minValue: a.minValue ?? null,
    maxValue: a.maxValue ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

// Validación de key: solo letras, números y underscore, sin espacios
const KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isValidAttributeKey(key: string): boolean {
  return KEY_REGEX.test(key);
}

// ============================================================
// Manager: AttributeTemplate (plantillas globales)
// ============================================================

export const attributeTemplateManager = {
  async getAll(): Promise<AttributeTemplate[]> {
    const templates = await db.attributeTemplate.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return templates.map(toDomainTemplate);
  },

  async getById(id: string): Promise<AttributeTemplate | null> {
    const t = await db.attributeTemplate.findUnique({ where: { id } });
    return t ? toDomainTemplate(t) : null;
  },

  async getByKey(key: string): Promise<AttributeTemplate | null> {
    const t = await db.attributeTemplate.findUnique({ where: { key } });
    return t ? toDomainTemplate(t) : null;
  },

  async create(input: AttributeTemplateInput): Promise<AttributeTemplate> {
    if (!isValidAttributeKey(input.key)) {
      throw new Error(
        `Key inválida: "${input.key}". Solo se permiten letras, números y underscore, y debe empezar con letra o underscore.`
      );
    }

    // Validación de min/max para numéricos
    if (input.type === 'numeric' && input.minValue != null && input.maxValue != null) {
      if (input.minValue > input.maxValue) {
        throw new Error(`minValue (${input.minValue}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
    }

    const created = await db.attributeTemplate.create({
      data: {
        name: input.name,
        key: input.key,
        type: input.type,
        minValue: input.type === 'numeric' ? input.minValue ?? null : null,
        maxValue: input.type === 'numeric' ? input.maxValue ?? null : null,
        defaultValue: input.defaultValue ?? null,
        description: input.description ?? null,
      },
    });
    return toDomainTemplate(created);
  },

  async update(id: string, input: AttributeTemplateInput): Promise<AttributeTemplate | null> {
    if (!isValidAttributeKey(input.key)) {
      throw new Error(
        `Key inválida: "${input.key}". Solo se permiten letras, números y underscore.`
      );
    }

    if (input.type === 'numeric' && input.minValue != null && input.maxValue != null) {
      if (input.minValue > input.maxValue) {
        throw new Error(`minValue (${input.minValue}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
    }

    const updated = await db.attributeTemplate.update({
      where: { id },
      data: {
        name: input.name,
        key: input.key,
        type: input.type,
        minValue: input.type === 'numeric' ? input.minValue ?? null : null,
        maxValue: input.type === 'numeric' ? input.maxValue ?? null : null,
        defaultValue: input.defaultValue ?? null,
        description: input.description ?? null,
      },
    });
    return toDomainTemplate(updated);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.attributeTemplate.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting attribute template:', error);
      return false;
    }
  },

  /**
   * Instancia un atributo en un NPC a partir de una plantilla.
   * Usa defaultValue si está definido; si no, deja valueNumber/valueText en null.
   */
  async instantiateForNpc(templateId: string, npcId: string): Promise<NPCAttribute> {
    const template = await this.getById(templateId);
    if (!template) {
      throw new Error(`Plantilla de atributo no encontrada: ${templateId}`);
    }

    // Verificar que el NPC existe
    const npc = await db.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      throw new Error(`NPC no encontrado: ${npcId}`);
    }

    // Verificar que no exista ya un atributo con esa key en el NPC
    const existing = await db.nPCAttribute.findUnique({
      where: { npcId_key: { npcId, key: template.key } },
    });
    if (existing) {
      throw new Error(`El NPC ya tiene un atributo con la key "${template.key}".`);
    }

    let valueNumber: number | null = null;
    let valueText: string | null = null;

    if (template.defaultValue) {
      if (template.type === 'numeric') {
        const parsed = parseFloat(template.defaultValue);
        if (!Number.isNaN(parsed)) valueNumber = parsed;
      } else {
        valueText = template.defaultValue;
      }
    }

    const created = await db.nPCAttribute.create({
      data: {
        npcId,
        name: template.name,
        key: template.key,
        type: template.type,
        valueText,
        valueNumber,
        minValue: template.minValue ?? null,
        maxValue: template.maxValue ?? null,
      },
    });
    return toDomainNPCAttribute(created);
  },
};

// ============================================================
// Manager: NPCAttribute (atributos por NPC)
// ============================================================

export const npcAttributeManager = {
  async getByNpcId(npcId: string): Promise<NPCAttribute[]> {
    const attrs = await db.nPCAttribute.findMany({
      where: { npcId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return attrs.map(toDomainNPCAttribute);
  },

  async getById(id: string): Promise<NPCAttribute | null> {
    const a = await db.nPCAttribute.findUnique({ where: { id } });
    return a ? toDomainNPCAttribute(a) : null;
  },

  async create(npcId: string, input: NPCAttributeInput): Promise<NPCAttribute> {
    if (!isValidAttributeKey(input.key)) {
      throw new Error(
        `Key inválida: "${input.key}". Solo se permiten letras, números y underscore.`
      );
    }

    // Validaciones numéricas
    if (input.type === 'numeric') {
      if (input.minValue != null && input.maxValue != null && input.minValue > input.maxValue) {
        throw new Error(`minValue (${input.minValue}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
      if (input.valueNumber != null && input.minValue != null && input.valueNumber < input.minValue) {
        throw new Error(`valueNumber (${input.valueNumber}) no puede ser menor que minValue (${input.minValue}).`);
      }
      if (input.valueNumber != null && input.maxValue != null && input.valueNumber > input.maxValue) {
        throw new Error(`valueNumber (${input.valueNumber}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
    }

    const npc = await db.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      throw new Error(`NPC no encontrado: ${npcId}`);
    }

    const existing = await db.nPCAttribute.findUnique({
      where: { npcId_key: { npcId, key: input.key } },
    });
    if (existing) {
      throw new Error(`El NPC ya tiene un atributo con la key "${input.key}".`);
    }

    const created = await db.nPCAttribute.create({
      data: {
        npcId,
        name: input.name,
        key: input.key,
        type: input.type,
        // 'text' y 'list' guardan su valor en valueText; 'numeric' en valueNumber
        valueText: input.type !== 'numeric' ? input.valueText ?? null : null,
        valueNumber: input.type === 'numeric' ? input.valueNumber ?? null : null,
        minValue: input.type === 'numeric' ? input.minValue ?? null : null,
        maxValue: input.type === 'numeric' ? input.maxValue ?? null : null,
      },
    });
    return toDomainNPCAttribute(created);
  },

  async update(id: string, input: NPCAttributeInput): Promise<NPCAttribute | null> {
    if (!isValidAttributeKey(input.key)) {
      throw new Error(
        `Key inválida: "${input.key}". Solo se permiten letras, números y underscore.`
      );
    }

    if (input.type === 'numeric') {
      if (input.minValue != null && input.maxValue != null && input.minValue > input.maxValue) {
        throw new Error(`minValue (${input.minValue}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
      if (input.valueNumber != null && input.minValue != null && input.valueNumber < input.minValue) {
        throw new Error(`valueNumber (${input.valueNumber}) no puede ser menor que minValue (${input.minValue}).`);
      }
      if (input.valueNumber != null && input.maxValue != null && input.valueNumber > input.maxValue) {
        throw new Error(`valueNumber (${input.valueNumber}) no puede ser mayor que maxValue (${input.maxValue}).`);
      }
    }

    const existing = await db.nPCAttribute.findUnique({ where: { id } });
    if (!existing) return null;

    // Si la key cambia, verificar que no colisione con otra en el mismo NPC
    if (existing.key !== input.key) {
      const conflict = await db.nPCAttribute.findUnique({
        where: { npcId_key: { npcId: existing.npcId, key: input.key } },
      });
      if (conflict) {
        throw new Error(`El NPC ya tiene otro atributo con la key "${input.key}".`);
      }
    }

    const updated = await db.nPCAttribute.update({
      where: { id },
      data: {
        name: input.name,
        key: input.key,
        type: input.type,
        // 'text' y 'list' guardan su valor en valueText; 'numeric' en valueNumber
        valueText: input.type !== 'numeric' ? input.valueText ?? null : null,
        valueNumber: input.type === 'numeric' ? input.valueNumber ?? null : null,
        minValue: input.type === 'numeric' ? input.minValue ?? null : null,
        maxValue: input.type === 'numeric' ? input.maxValue ?? null : null,
      },
    });
    return toDomainNPCAttribute(updated);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.nPCAttribute.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting NPC attribute:', error);
      return false;
    }
  },

  async deleteAllByNpc(npcId: string): Promise<number> {
    const result = await db.nPCAttribute.deleteMany({ where: { npcId } });
    return result.count;
  },

  /**
   * Devuelve un mapa { key -> valor formateado } listo para usar en
   * replaceVariables({{key}}) en cualquier parte de una card.
   */
  async getAttributesMapForNpc(npcId: string): Promise<Record<string, string>> {
    const attrs = await this.getByNpcId(npcId);
    const map: Record<string, string> = {};
    for (const attr of attrs) {
      map[attr.key] = formatAttributeValue(attr);
    }
    return map;
  },
};

const attributeDbManager = {
  attributeTemplateManager,
  npcAttributeManager,
  isValidAttributeKey,
};

export default attributeDbManager;

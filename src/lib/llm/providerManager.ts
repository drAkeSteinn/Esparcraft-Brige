// ============================================
// PROVIDER MANAGER - CRUD de proveedores LLM en la DB
// ============================================

import { db } from '@/lib/db';
import {
  LLMProviderConfig,
  LLMProviderInput,
  LLMProviderType,
  PROVIDERS,
} from './types';

// ---------- Helpers de conversión DB <-> Dominio ----------

function toDomain(p: any): LLMProviderConfig {
  return {
    id: p.id,
    name: p.name,
    type: p.type as LLMProviderType,
    apiUrl: p.apiUrl,
    apiKey: p.apiKey ?? null,
    model: p.model,
    temperature: p.temperature,
    maxTokens: p.maxTokens,
    reasoning: p.reasoning,
    toolCalling: p.toolCalling,
    isDefault: p.isDefault,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function validateInput(input: LLMProviderInput): void {
  if (!input.name?.trim()) {
    throw new Error('El nombre del proveedor es obligatorio');
  }
  if (!input.type || !PROVIDERS[input.type]) {
    throw new Error(`Tipo de proveedor inválido: ${input.type}`);
  }
  if (!input.apiUrl?.trim()) {
    throw new Error('La URL de la API es obligatoria');
  }
  if (!input.model?.trim()) {
    throw new Error('El modelo es obligatorio');
  }
  const info = PROVIDERS[input.type];
  // Validación de API key:
  // - Si input.apiKey es undefined: significa "mantener la existente" (caso de
  //   edición donde el usuario dejó el campo vacío). NO validamos aquí; el
  //   método update() decide si mantener o no la key existente.
  // - Si input.apiKey es un string vacío: el usuario intentó borrar la key.
  //   Para providers que requieren API key, esto debe rechazarse.
  // - Si input.apiKey es un string no vacío: se valida normalmente.
  if (info.requiresApiKey && input.apiKey !== undefined && !input.apiKey.trim()) {
    throw new Error(
      `El proveedor ${info.label} requiere API key. Deja el campo vacío para mantener la actual, o ingresa una nueva.`
    );
  }
  if (input.temperature != null && (input.temperature < 0 || input.temperature > 2)) {
    throw new Error('La temperatura debe estar entre 0 y 2');
  }
  if (input.maxTokens != null && input.maxTokens < 1) {
    throw new Error('maxTokens debe ser mayor a 0');
  }
}

// ---------- Manager ----------

export const providerManager = {
  /** Lista todos los proveedores */
  async getAll(): Promise<LLMProviderConfig[]> {
    const providers = await db.lLMProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return providers.map(toDomain);
  },

  /** Obtiene un proveedor por ID */
  async getById(id: string): Promise<LLMProviderConfig | null> {
    const p = await db.lLMProvider.findUnique({ where: { id } });
    return p ? toDomain(p) : null;
  },

  /** Obtiene el proveedor marcado como default (o el primero si ninguno lo está) */
  async getActive(): Promise<LLMProviderConfig | null> {
    let p = await db.lLMProvider.findFirst({
      where: { isDefault: true },
    });
    if (!p) {
      // Si no hay default, tomar el primero
      p = await db.lLMProvider.findFirst({
        orderBy: [{ createdAt: 'asc' }],
      });
    }
    return p ? toDomain(p) : null;
  },

  /** Crea un nuevo proveedor */
  async create(input: LLMProviderInput): Promise<LLMProviderConfig> {
    validateInput(input);

    // Si se marca como default, desmarcar los demás
    if (input.isDefault) {
      await db.lLMProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await db.lLMProvider.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        apiUrl: input.apiUrl.trim(),
        apiKey: input.apiKey?.trim() || null,
        model: input.model.trim(),
        temperature: input.temperature ?? 0.7,
        maxTokens: input.maxTokens ?? 2048,
        reasoning: input.reasoning ?? false,
        toolCalling: input.toolCalling ?? false,
        isDefault: input.isDefault ?? false,
      },
    });

    // Si era el primer proveedor, marcarlo como default automáticamente
    const count = await db.lLMProvider.count();
    if (count === 1 && !created.isDefault) {
      await db.lLMProvider.update({
        where: { id: created.id },
        data: { isDefault: true },
      });
      return toDomain({ ...created, isDefault: true });
    }

    return toDomain(created);
  },

  /** Actualiza un proveedor existente */
  async update(id: string, input: LLMProviderInput): Promise<LLMProviderConfig | null> {
    validateInput(input);

    const existing = await db.lLMProvider.findUnique({ where: { id } });
    if (!existing) return null;

    // Si se marca como default, desmarcar los demás
    if (input.isDefault && !existing.isDefault) {
      await db.lLMProvider.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.lLMProvider.update({
      where: { id },
      data: {
        name: input.name.trim(),
        type: input.type,
        apiUrl: input.apiUrl.trim(),
        // Si apiKey viene vacío/null, mantener el existente (no borrar)
        apiKey: input.apiKey !== undefined ? (input.apiKey?.trim() || null) : existing.apiKey,
        model: input.model.trim(),
        temperature: input.temperature ?? 0.7,
        maxTokens: input.maxTokens ?? 2048,
        reasoning: input.reasoning ?? false,
        toolCalling: input.toolCalling ?? false,
        isDefault: input.isDefault ?? false,
      },
    });

    return toDomain(updated);
  },

  /** Elimina un proveedor */
  async delete(id: string): Promise<boolean> {
    try {
      const existing = await db.lLMProvider.findUnique({ where: { id } });
      if (!existing) return false;

      await db.lLMProvider.delete({ where: { id } });

      // Si era el default, marcar el primero restante como default
      if (existing.isDefault) {
        const first = await db.lLMProvider.findFirst({
          orderBy: [{ createdAt: 'asc' }],
        });
        if (first) {
          await db.lLMProvider.update({
            where: { id: first.id },
            data: { isDefault: true },
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting LLM provider:', error);
      return false;
    }
  },

  /** Marca un proveedor como default (activo) */
  async setDefault(id: string): Promise<LLMProviderConfig | null> {
    const existing = await db.lLMProvider.findUnique({ where: { id } });
    if (!existing) return null;

    await db.lLMProvider.updateMany({
      where: { isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });

    const updated = await db.lLMProvider.update({
      where: { id },
      data: { isDefault: true },
    });

    return toDomain(updated);
  },

  /**
   * Crea un proveedor por defecto desde las variables de entorno (.env)
   * si no existe ninguno en la DB. Para migración automática.
   */
  async ensureDefaultFromEnv(): Promise<LLMProviderConfig | null> {
    const count = await db.lLMProvider.count();
    if (count > 0) return null; // ya hay proveedores

    const apiUrl = process.env.LLM_API_URL || 'http://localhost:11434';
    const model = process.env.LLM_MODEL || 'llama3.1';
    const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '2048');

    // Detectar tipo por la URL
    let type: LLMProviderType = 'custom';
    if (apiUrl.includes('ollama') || apiUrl.includes(':11434')) type = 'ollama';
    else if (apiUrl.includes('openai.com')) type = 'openai';
    else if (apiUrl.includes('x.ai')) type = 'grok';
    else if (apiUrl.includes('anthropic.com')) type = 'anthropic';

    console.log(`[providerManager] Auto-creando proveedor desde .env: tipo=${type}, model=${model}`);

    return this.create({
      name: `Default (${type})`,
      type,
      apiUrl,
      model,
      temperature,
      maxTokens,
      isDefault: true,
    });
  },
};

export default providerManager;

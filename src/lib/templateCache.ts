/**
 * CACHE INTELIGENTE PARA PLANTILLAS PROCESADAS
 * 
 * Sistema de cache LRU (Least Recently Used) para almacenar plantillas
 * ya procesadas y evitar repetir el reemplazo de variables innecesariamente.
 */

import { VariableContext } from './utils';

export interface CacheEntry<T> {
  /** Valor cacheado */
  value: T;
  /** Contexto usado para generar el valor */
  contextHash: string;
  /** Timestamp de creación */
  createdAt: number;
  /** Timestamp de último acceso */
  lastAccessed: number;
  /** Número de accesos */
  accessCount: number;
  /** Tamaño estimado en bytes */
  size: number;
}

export interface CacheStats {
  /** Número de entradas en el cache */
  entries: number;
  /** Tamaño total del cache en bytes */
  totalSize: number;
  /** Porcentaje de uso */
  usagePercent: number;
  /** Número total de hits */
  hits: number;
  /** Número total de misses */
  misses: number;
  /** Ratio de hits (0-1) */
  hitRate: number;
  /** Entradas más usadas */
  topEntries: Array<{
    key: string;
    accessCount: number;
    lastAccessed: number;
  }>;
}

export interface CacheOptions {
  /** Tamaño máximo del cache en bytes (default: 10MB) */
  maxSize?: number;
  /** Tiempo de vida de las entradas en ms (default: 1 hora) */
  ttl?: number;
  /** Número máximo de entradas (default: 1000) */
  maxEntries?: number;
  /** ¿Activar estadísticas? (default: true) */
  enableStats?: boolean;
}

/**
 * Implementación de cache LRU genérico
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private maxEntries: number;
  private ttl: number;
  private enableStats: boolean;
  private totalSize: number;
  private hits: number;
  private misses: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxEntries = options.maxEntries || 1000;
    this.ttl = options.ttl || 60 * 60 * 1000; // 1 hour default
    this.enableStats = options.enableStats ?? true;
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Obtiene un valor del cache
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.enableStats) {
        this.misses++;
      }
      return null;
    }

    // Verificar si expiró
    const now = Date.now();
    if (now - entry.createdAt > this.ttl) {
      this.delete(key);
      if (this.enableStats) {
        this.misses++;
      }
      return null;
    }

    // Actualizar estadísticas de acceso
    if (this.enableStats) {
      this.hits++;
      entry.lastAccessed = now;
      entry.accessCount++;
    }

    // Mover al final (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Establece un valor en el cache
   */
  set(key: K, value: V, size?: number): boolean {
    // Calcular tamaño si no se proporciona
    const entrySize = size ?? this.estimateSize(value);

    // Verificar si la entrada es demasiado grande
    if (entrySize > this.maxSize) {
      return false;
    }

    // Si ya existe, eliminarla primero
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evacuar espacio si es necesario
    this.evictIfNeeded(entrySize);

    // Crear nueva entrada
    const now = Date.now();
    const entry: CacheEntry<V> = {
      value,
      contextHash: this.generateContextHash(value),
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      size: entrySize
    };

    this.cache.set(key, entry);
    this.totalSize += entrySize;

    return true;
  }

  /**
   * Elimina una entrada del cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.totalSize -= entry.size;
    this.cache.delete(key);
    return true;
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Verifica si existe una clave en el cache
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Verificar si expiró
    const now = Date.now();
    if (now - entry.createdAt > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    const topEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key: String(key),
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      usagePercent: (this.totalSize / this.maxSize) * 100,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      topEntries
    };
  }

  /**
   * Limpia entradas expiradas
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.ttl) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Evacua entradas si es necesario (LRU)
   */
  private evictIfNeeded(neededSize: number): void {
    // Evacuar por tamaño
    while (this.totalSize + neededSize > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    // Evacuar por número de entradas
    while (this.cache.size >= this.maxEntries && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }
  }

  /**
   * Estima el tamaño en bytes de un valor
   */
  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Aproximación de bytes
    } catch {
      return 100; // Valor por defecto
    }
  }

  /**
   * Genera un hash del contexto
   */
  private generateContextHash(value: any): string {
    try {
      const str = JSON.stringify(value);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32-bit integer
      }
      return hash.toString(36);
    } catch {
      return Math.random().toString(36);
    }
  }
}

/**
 * Tipo de clave del cache de plantillas
 */
type TemplateCacheKey = {
  templateId: string;
  contextHash: string;
};

/**
 * Cache específico para plantillas procesadas
 */
export class TemplateCache {
  private cache: LRUCache<string, string>;
  private contextCache: Map<string, string>; // Contexto -> hash

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache<string, string>({
      maxSize: options.maxSize || 5 * 1024 * 1024, // 5MB default
      maxEntries: options.maxEntries || 500,
      ttl: options.ttl || 30 * 60 * 1000, // 30 minutos default
      enableStats: options.enableStats ?? true
    });
    this.contextCache = new Map();
  }

  /**
   * Genera una clave de cache única
   */
  private generateCacheKey(templateId: string, context: VariableContext): string {
    const contextHash = this.generateContextHash(context);
    const key = `${templateId}:${contextHash}`;
    return key;
  }

  /**
   * Genera un hash del contexto
   */
  private generateContextHash(context: VariableContext): string {
    try {
      // Solo incluir propiedades relevantes del contexto
      const relevantContext = {
        npc: {
          id: context.npc?.card?.name,
          location: context.npc?.location
        },
        world: {
          id: context.world?.name
        },
        pueblo: {
          id: context.pueblo?.name
        },
        edificio: {
          id: context.edificio?.name
        },
        jugador: {
          nombre: context.jugador?.nombre,
          raza: context.jugador?.raza,
          nivel: context.jugador?.nivel
        },
        session: {
          id: context.session?.id,
          messageCount: context.session?.messages?.length
        }
      };
      
      const str = JSON.stringify(relevantContext);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    } catch {
      return Math.random().toString(36);
    }
  }

  /**
   * Obtiene una plantilla procesada del cache
   */
  get(templateId: string, context: VariableContext): string | null {
    const key = this.generateCacheKey(templateId, context);
    return this.cache.get(key);
  }

  /**
   * Guarda una plantilla procesada en el cache
   */
  set(templateId: string, context: VariableContext, renderedContent: string): boolean {
    const key = this.generateCacheKey(templateId, context);
    return this.cache.set(key, renderedContent);
  }

  /**
   * Invalida el cache de una plantilla específica
   */
  invalidateTemplate(templateId: string): number {
    let invalidated = 0;
    for (const key of this.cache.getCache().keys()) {
      if (key.startsWith(`${templateId}:`)) {
        this.cache.getCache().delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * Invalida todo el cache
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Realiza limpieza de entradas expiradas
   */
  cleanExpired(): number {
    return this.cache.cleanExpired();
  }

  /**
   * Limpia caché relacionado con una sesión específica
   */
  invalidateSession(sessionId: string): number {
    let invalidated = 0;
    for (const key of this.cache.getCache().keys()) {
      // Las claves que contienen el ID de sesión en el hash del contexto
      const entry = this.cache.getCache().get(key);
      if (entry && entry.contextHash.includes(sessionId)) {
        this.cache.getCache().delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }
}

/**
 * Extensión de LRUCache para exponer el mapa interno
 */
declare module './templateCache' {
  interface LRUCache<K, V> {
    getCache(): Map<K, CacheEntry<V>>;
  }
}

LRUCache.prototype.getCache = function() {
  return this.cache;
};

// Instancia global del cache de plantillas
export const templateCache = new TemplateCache({
  maxSize: 5 * 1024 * 1024, // 5MB
  maxEntries: 500,
  ttl: 30 * 60 * 1000, // 30 minutos
  enableStats: true
});

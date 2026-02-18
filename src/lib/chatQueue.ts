/**
 * Sistema de Cola para Chat Requests
 * 
 * Procesa los requests de chat de forma secuencial para evitar
 * sobrecargar el LLM con múltiples llamadas simultáneas.
 * 
 * Características:
 * - Cola FIFO (First In, First Out)
 * - Procesamiento secuencial (1 request a la vez)
 * - Timeout configurable
 * - Estado en tiempo real
 * - Persistencia en archivo
 */

import { ChatTriggerPayload } from './types';
import { handleChatTrigger } from './triggerHandlers';
import fs from 'fs/promises';
import path from 'path';

// ============================================
// TIPOS
// ============================================

export interface QueueItem {
  id: string;
  payload: ChatTriggerPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface QueueStats {
  totalProcessed: number;
  totalFailed: number;
  currentQueueSize: number;
  isProcessing: boolean;
  currentItemId?: string;
  averageProcessingTime?: number;
}

export interface QueueConfig {
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  persistToFile: boolean;
  persistencePath: string;
}

// ============================================
// CONFIGURACIÓN POR DEFECTO
// ============================================

const DEFAULT_CONFIG: QueueConfig = {
  enabled: true,
  maxRetries: 2,
  timeoutMs: 120000, // 2 minutos
  persistToFile: true,
  persistencePath: 'db/chat-queue.json'
};

// ============================================
// CLASE PRINCIPAL
// ============================================

class ChatQueue {
  private queue: QueueItem[] = [];
  private config: QueueConfig;
  private isProcessing: boolean = false;
  private stats: QueueStats = {
    totalProcessed: 0,
    totalFailed: 0,
    currentQueueSize: 0,
    isProcessing: false
  };
  private processingTimes: number[] = [];
  private initialized: boolean = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Inicializa la cola (carga estado persistido)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.persistToFile) {
      await this.loadFromFile();
    }

    this.initialized = true;
    console.log('[ChatQueue] Inicializado. Items en cola:', this.queue.length);

    // Procesar items pendientes (que quedaron de una ejecución anterior)
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    if (pendingItems.length > 0) {
      console.log('[ChatQueue] Procesando items pendientes:', pendingItems.length);
      this.processNext();
    }
  }

  /**
   * Agrega un request a la cola
   */
  async enqueue(payload: ChatTriggerPayload): Promise<{ queueId: string; position: number }> {
    const id = this.generateId();
    
    const item: QueueItem = {
      id,
      payload,
      status: 'pending',
      addedAt: new Date().toISOString(),
      retryCount: 0
    };

    this.queue.push(item);
    this.stats.currentQueueSize = this.queue.length;

    console.log(`[ChatQueue] Request agregado. ID: ${id}, Posición: ${this.queue.length}`);

    // Persistir estado
    if (this.config.persistToFile) {
      await this.saveToFile();
    }

    // Iniciar procesamiento si no está procesando
    if (!this.isProcessing) {
      this.processNext();
    }

    return {
      queueId: id,
      position: this.queue.length
    };
  }

  /**
   * Obtiene el estado de un item en la cola
   */
  getStatus(queueId: string): QueueItem | undefined {
    return this.queue.find(item => item.id === queueId);
  }

  /**
   * Obtiene estadísticas de la cola
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      isProcessing: this.isProcessing,
      currentQueueSize: this.queue.filter(i => i.status === 'pending').length
    };
  }

  /**
   * Obtiene todos los items de la cola
   */
  getAllItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Obtiene items pendientes
   */
  getPendingItems(): QueueItem[] {
    return this.queue.filter(item => item.status === 'pending');
  }

  /**
   * Limpia items completados/fallidos de la cola
   */
  async clearCompleted(): Promise<number> {
    const before = this.queue.length;
    this.queue = this.queue.filter(item => item.status === 'pending' || item.status === 'processing');
    const removed = before - this.queue.length;

    if (this.config.persistToFile) {
      await this.saveToFile();
    }

    console.log(`[ChatQueue] Limpiados ${removed} items completados/fallidos`);
    return removed;
  }

  /**
   * Limpia toda la cola (cancela pendientes)
   */
  async clearAll(): Promise<void> {
    this.queue = [];
    this.stats.currentQueueSize = 0;
    
    if (this.config.persistToFile) {
      await this.saveToFile();
    }

    console.log('[ChatQueue] Cola limpiada completamente');
  }

  /**
   * Procesa el siguiente item en la cola
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;

    const nextItem = this.queue.find(item => item.status === 'pending');
    if (!nextItem) {
      console.log('[ChatQueue] No hay más items para procesar');
      return;
    }

    this.isProcessing = true;
    this.stats.isProcessing = true;
    this.stats.currentItemId = nextItem.id;
    nextItem.status = 'processing';
    nextItem.startedAt = new Date().toISOString();

    console.log(`[ChatQueue] Procesando item: ${nextItem.id}`);

    if (this.config.persistToFile) {
      await this.saveToFile();
    }

    try {
      // Ejecutar con timeout
      const result = await this.executeWithTimeout(nextItem);
      
      nextItem.status = 'completed';
      nextItem.completedAt = new Date().toISOString();
      nextItem.result = result;

      this.stats.totalProcessed++;
      
      // Calcular tiempo de procesamiento
      const processingTime = new Date(nextItem.completedAt).getTime() - new Date(nextItem.startedAt).getTime();
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      this.stats.averageProcessingTime = this.calculateAverageProcessingTime();

      console.log(`[ChatQueue] Item completado: ${nextItem.id} (${processingTime}ms)`);

    } catch (error) {
      console.error(`[ChatQueue] Error procesando item ${nextItem.id}:`, error);

      // Reintentar si es posible
      if (nextItem.retryCount < this.config.maxRetries) {
        nextItem.retryCount++;
        nextItem.status = 'pending';
        console.log(`[ChatQueue] Reintentando item ${nextItem.id} (intento ${nextItem.retryCount})`);
      } else {
        nextItem.status = 'failed';
        nextItem.error = error instanceof Error ? error.message : 'Unknown error';
        nextItem.completedAt = new Date().toISOString();
        this.stats.totalFailed++;
        console.log(`[ChatQueue] Item fallido definitivamente: ${nextItem.id}`);
      }
    }

    if (this.config.persistToFile) {
      await this.saveToFile();
    }

    this.isProcessing = false;
    this.stats.isProcessing = false;
    this.stats.currentItemId = undefined;
    this.stats.currentQueueSize = this.queue.filter(i => i.status === 'pending').length;

    // Procesar siguiente item
    setImmediate(() => this.processNext());
  }

  /**
   * Ejecuta un item con timeout
   */
  private async executeWithTimeout(item: QueueItem): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      try {
        const result = await handleChatTrigger(item.payload);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Genera un ID único para cada item
   */
  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Calcula el tiempo promedio de procesamiento
   */
  private calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.processingTimes.length);
  }

  /**
   * Guarda el estado de la cola en archivo
   */
  private async saveToFile(): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), this.config.persistencePath);
      const dir = path.dirname(filePath);
      
      // Crear directorio si no existe
      await fs.mkdir(dir, { recursive: true });
      
      const data = {
        queue: this.queue,
        stats: this.stats,
        savedAt: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[ChatQueue] Error guardando cola en archivo:', error);
    }
  }

  /**
   * Carga el estado de la cola desde archivo
   */
  private async loadFromFile(): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), this.config.persistencePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      this.queue = data.queue || [];
      this.stats = {
        ...this.stats,
        ...(data.stats || {}),
        currentQueueSize: this.queue.filter(i => i.status === 'pending').length
      };

      // Resetear items que estaban en 'processing' a 'pending'
      this.queue.forEach(item => {
        if (item.status === 'processing') {
          item.status = 'pending';
          item.retryCount = 0;
        }
      });

      console.log('[ChatQueue] Estado cargado desde archivo');
    } catch (error) {
      // Archivo no existe o es inválido, empezar con cola vacía
      console.log('[ChatQueue] No se encontró estado previo, iniciando cola vacía');
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const chatQueue = new ChatQueue();

// Inicializar automáticamente
if (typeof window === 'undefined') {
  // Solo en servidor
  chatQueue.initialize().catch(console.error);
}

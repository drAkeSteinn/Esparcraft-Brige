/**
 * ESTADÍSTICAS DE USO DEL GRIMORIO
 *
 * Sistema para trackear el uso de variables del Grimorio
 * y generar métricas de rendimiento
 */

import { GrimorioCardType, VariableResolutionType } from './types';

export interface UsageStats {
  /** Total de resoluciones */
  totalResolutions: number;
  /** Por tipo de variable */
  byType: {
    primaria: number;
    plantilla: number;
    desconocida: number;
  };
  /** Errores por tipo */
  errorsByType: {
    primaria: number;
    plantilla: number;
    desconocida: number;
  };
  /** Estadísticas de cache */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  /** Estadísticas de tiempo de ejecución */
  performance: {
    avgExecutionTime: number;
    maxExecutionTime: number;
    minExecutionTime: number;
    totalExecutionTime: number;
  };
}

export interface ResolutionLog {
  timestamp: number;
  variableName: string;
  variableType: VariableResolutionType;
  resolutionTime: number;
  fromCache: boolean;
  success: boolean;
  error?: string;
}

class GrimorioStatsManager {
  private stats: UsageStats;
  private resolutionLogs: ResolutionLog[];
  private maxLogs: number;

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
    this.stats = {
      totalResolutions: 0,
      byType: {
        primaria: 0,
        plantilla: 0,
        desconocida: 0
      },
      errorsByType: {
        primaria: 0,
        plantilla: 0,
        desconocida: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      performance: {
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Infinity,
        totalExecutionTime: 0
      }
    };
    this.resolutionLogs = [];
  }

  /**
   * Registra una resolución de variable
   */
  logResolution(
    variableName: string,
    variableType: VariableResolutionType,
    executionTime: number,
    fromCache: boolean,
    success: boolean,
    error?: string
  ): void {
    // Actualizar estadísticas
    this.stats.totalResolutions++;
    this.stats.byType[variableType]++;

    if (!success) {
      this.stats.errorsByType[variableType]++;
    }

    // Actualizar estadísticas de cache
    if (fromCache) {
      this.stats.cache.hits++;
    } else {
      this.stats.cache.misses++;
    }

    // Recalcular hit rate
    const totalCacheRequests = this.stats.cache.hits + this.stats.cache.misses;
    this.stats.cache.hitRate = totalCacheRequests > 0
      ? this.stats.cache.hits / totalCacheRequests
      : 0;

    // Actualizar estadísticas de performance
    this.stats.performance.totalExecutionTime += executionTime;
    this.stats.performance.avgExecutionTime =
      this.stats.performance.totalExecutionTime / this.stats.totalResolutions;

    if (executionTime > this.stats.performance.maxExecutionTime) {
      this.stats.performance.maxExecutionTime = executionTime;
    }

    if (executionTime < this.stats.performance.minExecutionTime) {
      this.stats.performance.minExecutionTime = executionTime;
    }

    // Agregar al log
    const logEntry: ResolutionLog = {
      timestamp: Date.now(),
      variableName,
      variableType,
      resolutionTime: executionTime,
      fromCache,
      success,
      error
    };

    this.resolutionLogs.push(logEntry);

    // Mantener solo los últimos N logs
    if (this.resolutionLogs.length > this.maxLogs) {
      this.resolutionLogs.shift();
    }

    // Log detallado en consola
    console.log(`[Grimorio Stats] Variable: ${variableName} | Tipo: ${variableType} | ` +
      `Tiempo: ${executionTime}ms | Cache: ${fromCache ? 'HIT' : 'MISS'} | ` +
      `Success: ${success ? '✓' : '✗'}${error ? ` | Error: ${error}` : ''}`);
  }

  /**
   * Obtiene las estadísticas actuales
   */
  getStats(): UsageStats {
    return { ...this.stats };
  }

  /**
   * Obtiene los últimos N logs de resolución
   */
  getRecentLogs(limit: number = 50): ResolutionLog[] {
    return this.resolutionLogs.slice(-limit);
  }

  /**
   * Obtiene logs de un tipo específico
   */
  getLogsByType(variableType: VariableResolutionType, limit: number = 50): ResolutionLog[] {
    return this.resolutionLogs
      .filter(log => log.variableType === variableType)
      .slice(-limit);
  }

  /**
   * Obtiene logs de errores
   */
  getErrorLogs(limit: number = 50): ResolutionLog[] {
    return this.resolutionLogs
      .filter(log => !log.success)
      .slice(-limit);
  }

  /**
   * Obtiene estadísticas de variables más usadas
   */
  getTopVariables(limit: number = 10): Array<{ variableName: string; count: number; avgTime: number }> {
    const variableUsage = new Map<string, { count: number; totalTime: number }>();

    for (const log of this.resolutionLogs) {
      const existing = variableUsage.get(log.variableName);
      if (existing) {
        existing.count++;
        existing.totalTime += log.resolutionTime;
      } else {
        variableUsage.set(log.variableName, { count: 1, totalTime: log.resolutionTime });
      }
    }

    return Array.from(variableUsage.entries())
      .map(([variableName, { count, totalTime }]) => ({
        variableName,
        count,
        avgTime: totalTime / count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Reinicia las estadísticas
   */
  reset(): void {
    this.stats = {
      totalResolutions: 0,
      byType: {
        primaria: 0,
        plantilla: 0,
        desconocida: 0
      },
      errorsByType: {
        primaria: 0,
        plantilla: 0,
        desconocida: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      performance: {
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Infinity,
        totalExecutionTime: 0
      }
    };
    this.resolutionLogs = [];
    console.log('[Grimorio Stats] Estadísticas reiniciadas');
  }

  /**
   * Genera un reporte de estadísticas en formato legible
   */
  generateReport(): string {
    const report: string[] = [];
    report.push('\n=== ESTADÍSTICAS DEL GRIMORIO ===');
    report.push(`Total de resoluciones: ${this.stats.totalResolutions}`);
    report.push('\n--- Por Tipo ---');
    report.push(`Primarias: ${this.stats.byType.primaria} (${((this.stats.byType.primaria / this.stats.totalResolutions) * 100).toFixed(1)}%)`);
    report.push(`Plantillas: ${this.stats.byType.plantilla} (${((this.stats.byType.plantilla / this.stats.totalResolutions) * 100).toFixed(1)}%)`);
    report.push(`Desconocidas: ${this.stats.byType.desconocida} (${((this.stats.byType.desconocida / this.stats.totalResolutions) * 100).toFixed(1)}%)`);
    report.push('\n--- Errores ---');
    report.push(`Primarias: ${this.stats.errorsByType.primaria}`);
    report.push(`Plantillas: ${this.stats.errorsByType.plantilla}`);
    report.push(`Desconocidas: ${this.stats.errorsByType.desconocida}`);
    report.push('\n--- Cache ---');
    report.push(`Hits: ${this.stats.cache.hits}`);
    report.push(`Misses: ${this.stats.cache.misses}`);
    report.push(`Hit Rate: ${(this.stats.cache.hitRate * 100).toFixed(1)}%`);
    report.push('\n--- Performance ---');
    report.push(`Tiempo promedio: ${this.stats.performance.avgExecutionTime.toFixed(2)}ms`);
    report.push(`Tiempo máximo: ${this.stats.performance.maxExecutionTime.toFixed(2)}ms`);
    report.push(`Tiempo mínimo: ${this.stats.performance.minExecutionTime === Infinity ? 'N/A' : this.stats.performance.minExecutionTime.toFixed(2) + 'ms'}`);

    // Top variables
    const topVariables = this.getTopVariables(5);
    report.push('\n--- Variables Más Usadas ---');
    for (const v of topVariables) {
      report.push(`${v.variableName}: ${v.count} veces (${v.avgTime.toFixed(2)}ms promedio)`);
    }

    report.push('================================\n');
    return report.join('\n');
  }
}

// Instancia global del gestor de estadísticas
export const grimorioStats = new GrimorioStatsManager();

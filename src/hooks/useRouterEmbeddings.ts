'use client';

import { useState, useCallback, useEffect } from 'react';
import type { EmbeddingConfig } from '@/components/dashboard/EmbeddingSwitcher';

// Storage key para guardar configuraciones de embeddings
const EMBEDDING_CONFIG_KEY = 'router_embedding_configs';

// Configuración por defecto para cada tipo de trigger
export const DEFAULT_EMBEDDING_CONFIGS: Record<string, EmbeddingConfig> = {
  chat: {
    enabled: false,
    namespace: 'chat-npc-default',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: false,
    relatedNamespaces: []
  },
  resumen_sesion: {
    enabled: false,
    namespace: 'session-summaries',
    maxResults: 3,
    threshold: 0.75,
    includeRelated: false,
    relatedNamespaces: ['npc-summaries']
  },
  resumen_npc: {
    enabled: false,
    namespace: 'npc-summaries',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: true,
    relatedNamespaces: ['session-summaries']
  },
  resumen_edificio: {
    enabled: false,
    namespace: 'edificio-default',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: true,
    relatedNamespaces: ['npc-summaries']
  },
  resumen_pueblo: {
    enabled: false,
    namespace: 'pueblo-default',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: true,
    relatedNamespaces: ['edificio-default', 'npc-summaries']
  },
  resumen_mundo: {
    enabled: false,
    namespace: 'mundo-default',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: true,
    relatedNamespaces: ['pueblo-default', 'edificio-default', 'npc-summaries']
  },
  nuevo_lore: {
    enabled: false,
    namespace: 'lore-default',
    maxResults: 5,
    threshold: 0.7,
    includeRelated: true,
    relatedNamespaces: []
  }
};

interface EmbeddingSearchResult {
  id: string;
  content: string;
  similarity: number;
  namespace: string;
  source_type?: string;
  source_id?: string;
  metadata?: Record<string, any>;
}

interface UseRouterEmbeddingsOptions {
  triggerType: keyof typeof DEFAULT_EMBEDDING_CONFIGS;
  entityId?: string; // npcId, edificioId, puebloId, mundoId
}

/**
 * Hook para manejar embeddings en el RouterTab
 */
export function useRouterEmbeddings({ triggerType, entityId }: UseRouterEmbeddingsOptions) {
  // Generar namespace dinámico basado en el entityId
  const getDynamicNamespace = useCallback(() => {
    if (!entityId) return DEFAULT_EMBEDDING_CONFIGS[triggerType]?.namespace || 'default';
    
    switch (triggerType) {
      case 'chat':
        return `chat-npc-${entityId}`;
      case 'resumen_sesion':
        return 'session-summaries'; // No depende del NPC
      case 'resumen_npc':
        return `npc-${entityId}`;
      case 'resumen_edificio':
        return `edificio-${entityId}`;
      case 'resumen_pueblo':
        return `pueblo-${entityId}`;
      case 'resumen_mundo':
        return `mundo-${entityId}`;
      case 'nuevo_lore':
        return `lore-${entityId}`;
      default:
        return DEFAULT_EMBEDDING_CONFIGS[triggerType]?.namespace || 'default';
    }
  }, [triggerType, entityId]);

  const [config, setConfig] = useState<EmbeddingConfig>(() => {
    // Cargar configuración guardada
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(EMBEDDING_CONFIG_KEY);
        if (saved) {
          const allConfigs = JSON.parse(saved);
          const savedConfig = allConfigs[triggerType];
          if (savedConfig) {
            return {
              ...DEFAULT_EMBEDDING_CONFIGS[triggerType],
              ...savedConfig,
              namespace: getDynamicNamespace()
            };
          }
        }
      } catch (e) {
        console.error('Error loading embedding config:', e);
      }
    }
    
    return {
      ...DEFAULT_EMBEDDING_CONFIGS[triggerType],
      namespace: getDynamicNamespace()
    };
  });

  const [results, setResults] = useState<EmbeddingSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actualizar namespace cuando cambie el entityId
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      namespace: getDynamicNamespace()
    }));
  }, [getDynamicNamespace]);

  // Guardar configuración cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(EMBEDDING_CONFIG_KEY);
        const allConfigs = saved ? JSON.parse(saved) : {};
        allConfigs[triggerType] = {
          enabled: config.enabled,
          maxResults: config.maxResults,
          threshold: config.threshold,
          includeRelated: config.includeRelated,
          relatedNamespaces: config.relatedNamespaces
        };
        localStorage.setItem(EMBEDDING_CONFIG_KEY, JSON.stringify(allConfigs));
      } catch (e) {
        console.error('Error saving embedding config:', e);
      }
    }
  }, [config, triggerType]);

  /**
   * Buscar embeddings relevantes
   */
  const searchEmbeddings = useCallback(async (query: string): Promise<EmbeddingSearchResult[]> => {
    if (!config.enabled || !query || query.trim().length < 3) {
      setResults([]);
      return [];
    }

    setIsSearching(true);
    setError(null);

    try {
      // Buscar en el namespace principal
      const response = await fetch('/api/search/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          namespace: config.namespace,
          limit: config.maxResults,
          threshold: config.threshold
        })
      });

      const data = await response.json();

      if (data.success && data.data?.results) {
        let allResults = [...data.data.results];

        // Buscar en namespaces relacionados si está habilitado
        if (config.includeRelated && config.relatedNamespaces.length > 0) {
          for (const relatedNs of config.relatedNamespaces) {
            try {
              const relatedResponse = await fetch('/api/search/vector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query,
                  namespace: relatedNs,
                  limit: Math.ceil(config.maxResults / 2),
                  threshold: config.threshold
                })
              });

              const relatedData = await relatedResponse.json();
              if (relatedData.success && relatedData.data?.results) {
                allResults = [...allResults, ...relatedData.data.results];
              }
            } catch (e) {
              console.error(`Error searching related namespace ${relatedNs}:`, e);
            }
          }
        }

        // Ordenar por similitud y limitar
        allResults.sort((a, b) => b.similarity - a.similarity);
        allResults = allResults.slice(0, config.maxResults);

        setResults(allResults);
        return allResults;
      }

      setResults([]);
      return [];
    } catch (err: any) {
      console.error('Error searching embeddings:', err);
      setError(err.message || 'Error al buscar embeddings');
      setResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [config]);

  /**
   * Toggle enabled
   */
  const toggleEnabled = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  }, []);

  /**
   * Actualizar configuración
   */
  const updateConfig = useCallback((updates: Partial<EmbeddingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Formatear resultados para incluir en el prompt
   */
  const formatResultsForPrompt = useCallback((results: EmbeddingSearchResult[]): string => {
    if (!results || results.length === 0) return '';

    const formatted = results.map((r, i) => {
      const source = r.source_type ? `[${r.source_type}]` : '';
      return `${i + 1}. ${source} ${r.content}`;
    }).join('\n');

    return `---
CONTEXTO RELEVANTE (embeddings):
${formatted}
---`;
  }, []);

  /**
   * Resetear configuración a valores por defecto
   */
  const resetConfig = useCallback(() => {
    setConfig({
      ...DEFAULT_EMBEDDING_CONFIGS[triggerType],
      namespace: getDynamicNamespace()
    });
  }, [triggerType, getDynamicNamespace]);

  return {
    config,
    results,
    isSearching,
    error,
    searchEmbeddings,
    toggleEnabled,
    updateConfig,
    formatResultsForPrompt,
    resetConfig
  };
}

/**
 * Hook para manejar todos los embeddings del Router
 */
export function useRouterEmbeddingsManager() {
  const [configs, setConfigs] = useState<Record<string, EmbeddingConfig>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(EMBEDDING_CONFIG_KEY);
        if (saved) {
          return { ...DEFAULT_EMBEDDING_CONFIGS, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error('Error loading embedding configs:', e);
      }
    }
    return DEFAULT_EMBEDDING_CONFIGS;
  });

  /**
   * Actualizar configuración de un trigger específico
   */
  const updateTriggerConfig = useCallback((
    triggerType: keyof typeof DEFAULT_EMBEDDING_CONFIGS,
    updates: Partial<EmbeddingConfig>
  ) => {
    setConfigs(prev => {
      const newConfigs = {
        ...prev,
        [triggerType]: {
          ...DEFAULT_EMBEDDING_CONFIGS[triggerType],
          ...prev[triggerType],
          ...updates
        }
      };
      
      // Guardar en localStorage
      localStorage.setItem(EMBEDDING_CONFIG_KEY, JSON.stringify(newConfigs));
      
      return newConfigs;
    });
  }, []);

  /**
   * Habilitar/deshabilitar todos los embeddings
   */
  const toggleAll = useCallback((enabled: boolean) => {
    setConfigs(prev => {
      const newConfigs = { ...prev };
      Object.keys(newConfigs).forEach(key => {
        newConfigs[key] = { ...newConfigs[key], enabled };
      });
      localStorage.setItem(EMBEDDING_CONFIG_KEY, JSON.stringify(newConfigs));
      return newConfigs;
    });
  }, []);

  /**
   * Resetear todas las configuraciones
   */
  const resetAll = useCallback(() => {
    setConfigs(DEFAULT_EMBEDDING_CONFIGS);
    localStorage.setItem(EMBEDDING_CONFIG_KEY, JSON.stringify(DEFAULT_EMBEDDING_CONFIGS));
  }, []);

  /**
   * Obtener configuración de un trigger
   */
  const getTriggerConfig = useCallback((
    triggerType: keyof typeof DEFAULT_EMBEDDING_CONFIGS
  ): EmbeddingConfig => {
    return configs[triggerType] || DEFAULT_EMBEDDING_CONFIGS[triggerType];
  }, [configs]);

  return {
    configs,
    updateTriggerConfig,
    toggleAll,
    resetAll,
    getTriggerConfig
  };
}

export default useRouterEmbeddings;

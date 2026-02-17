/**
 * Sistema de Persistencia de Configuración
 *
 * Guarda la configuración en un archivo JSON para que persista
 * entre reinicios del servidor.
 */

import fs from 'fs';
import path from 'path';

// Ruta del archivo de configuración
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'embeddings-config.json');

// Interfaz de configuración
export interface EmbeddingsConfig {
  ollamaUrl: string;
  model: string;
  dimension: number;
  similarityThreshold: number; // Umbral de similitud para búsquedas (0.0 - 1.0)
  maxResults: number; // Máximo de resultados en búsquedas
  updatedAt?: string;
}

// Configuración por defecto
const DEFAULT_CONFIG: EmbeddingsConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'bge-m3:567m',
  dimension: 1024,
  similarityThreshold: 0.5, // 50% por defecto
  maxResults: 5,
  updatedAt: new Date().toISOString()
};

// Cache en memoria
let cachedConfig: EmbeddingsConfig | null = null;

/**
 * Asegura que el directorio de configuración existe
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Carga la configuración desde el archivo
 */
export function loadConfig(): EmbeddingsConfig {
  // Usar cache si está disponible
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    ensureConfigDir();

    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content) as EmbeddingsConfig;

      // Validar campos requeridos
      if (!config.ollamaUrl || !config.model || !config.dimension) {
        console.warn('⚠️  Configuración incompleta, usando valores por defecto');
        cachedConfig = { ...DEFAULT_CONFIG, ...config };
        return cachedConfig;
      }

      // Asegurar valores por defecto para campos nuevos
      if (config.similarityThreshold === undefined) {
        config.similarityThreshold = DEFAULT_CONFIG.similarityThreshold;
      }
      if (config.maxResults === undefined) {
        config.maxResults = DEFAULT_CONFIG.maxResults;
      }

      cachedConfig = config;
      console.log('✅ Configuración cargada desde archivo:', config);
      return config;
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
  }

  // Crear configuración por defecto
  cachedConfig = { ...DEFAULT_CONFIG };
  saveConfig(cachedConfig);
  return cachedConfig;
}

/**
 * Guarda la configuración en el archivo
 */
export function saveConfig(config: Partial<EmbeddingsConfig>): EmbeddingsConfig {
  try {
    ensureConfigDir();

    // Cargar configuración actual y mezclar
    const currentConfig = cachedConfig || loadConfig();
    const newConfig: EmbeddingsConfig = {
      ...currentConfig,
      ...config,
      updatedAt: new Date().toISOString()
    };

    // Validar similarityThreshold
    if (newConfig.similarityThreshold < 0) newConfig.similarityThreshold = 0;
    if (newConfig.similarityThreshold > 1) newConfig.similarityThreshold = 1;

    // Validar maxResults
    if (newConfig.maxResults < 1) newConfig.maxResults = 1;
    if (newConfig.maxResults > 100) newConfig.maxResults = 100;

    // Guardar en archivo
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');

    // Actualizar cache
    cachedConfig = newConfig;

    // Actualizar variables de entorno en runtime
    process.env.OLLAMA_URL = newConfig.ollamaUrl;
    process.env.EMBEDDING_MODEL = newConfig.model;
    process.env.EMBEDDING_DIMENSION = newConfig.dimension.toString();

    console.log('✅ Configuración guardada:', newConfig);

    return newConfig;
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    throw error;
  }
}

/**
 * Obtiene la configuración actual (sin recargar desde archivo)
 */
export function getConfig(): EmbeddingsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  return loadConfig();
}

/**
 * Obtiene solo el threshold de similitud
 */
export function getSimilarityThreshold(): number {
  const config = getConfig();
  return config.similarityThreshold ?? DEFAULT_CONFIG.similarityThreshold;
}

/**
 * Obtiene el máximo de resultados
 */
export function getMaxResults(): number {
  const config = getConfig();
  return config.maxResults ?? DEFAULT_CONFIG.maxResults;
}

/**
 * Invalida el cache y fuerza recarga desde archivo
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
}

/**
 * Resetea la configuración a valores por defecto
 */
export function resetConfig(): EmbeddingsConfig {
  cachedConfig = { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() };
  saveConfig(cachedConfig);
  return cachedConfig;
}

// Cargar configuración al iniciar
loadConfig();

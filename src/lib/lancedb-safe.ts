/**
 * Wrapper seguro para LanceDB
 * 
 * Maneja errores de importación de módulos nativos y proporciona
 * una interfaz consistente independientemente de si LanceDB está disponible.
 */

import * as path from 'path';
import * as fs from 'fs';

// ============================================
// TIPOS
// ============================================

export type Platform = 'win32' | 'linux' | 'darwin' | 'unknown';

export interface SystemInfo {
  platform: Platform;
  isWindows: boolean;
  isLinux: boolean;
  isMacOS: boolean;
  currentUri: string | null;
  isInitialized: boolean;
  lancedbAvailable: boolean;
  lancedbError?: string;
}

export interface DBStats {
  totalEmbeddings: number;
  totalNamespaces: number;
  embeddingsByNamespace: Record<string, number>;
  embeddingsBySourceType: Record<string, number>;
}

export interface ConnectionResult {
  success: boolean;
  connected: boolean;
  message: string;
  error?: string;
  suggestion?: string;
  systemInfo?: SystemInfo;
  dbStats?: DBStats;
  directoryInfo?: {
    path: string;
    exists: boolean;
    writable: boolean;
  };
}

// ============================================
// DETECCIÓN DE PLATAFORMA
// ============================================

export function getPlatform(): Platform {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform as Platform;
  }
  return 'unknown';
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

// ============================================
// GESTIÓN DE DIRECTORIOS
// ============================================

export function getDefaultLanceDBPath(): string {
  const platform = getPlatform();
  const cwd = process.cwd();
  
  if (platform === 'win32') {
    return path.resolve(cwd, 'data', 'lancedb');
  }
  
  return path.join(cwd, 'data', 'lancedb');
}

export function normalizePath(uri: string): string {
  if (uri.startsWith('mem://') || uri.startsWith('lancedb://')) {
    return uri;
  }
  
  let normalized = path.normalize(uri);
  
  if (isWindows()) {
    normalized = normalized.replace(/\//g, '\\');
  }
  
  return normalized;
}

export function checkDirectoryPermissions(dirPath: string): {
  exists: boolean;
  writable: boolean;
  error?: string;
} {
  try {
    const normalizedPath = normalizePath(dirPath);
    
    // Verificar si el directorio padre existe
    const parentDir = path.dirname(normalizedPath);
    
    if (!fs.existsSync(parentDir)) {
      return { exists: false, writable: false, error: 'Parent directory does not exist' };
    }
    
    // Si el directorio existe, verificar permisos
    if (fs.existsSync(normalizedPath)) {
      try {
        fs.accessSync(normalizedPath, fs.constants.W_OK);
        return { exists: true, writable: true };
      } catch {
        return { exists: true, writable: false, error: 'No write permission' };
      }
    }
    
    // El directorio no existe pero el padre sí, verificar si podemos crearlo
    try {
      fs.accessSync(parentDir, fs.constants.W_OK);
      return { exists: false, writable: true }; // Podemos crearlo
    } catch {
      return { exists: false, writable: false, error: 'No write permission on parent directory' };
    }
  } catch (error: any) {
    return { exists: false, writable: false, error: error.message };
  }
}

export function ensureLanceDBDirectory(uri: string): { success: boolean; path: string; error?: string } {
  try {
    if (uri.startsWith('mem://') || uri.startsWith('lancedb://')) {
      return { success: true, path: uri };
    }
    
    const normalizedPath = normalizePath(uri);
    
    // Crear directorios recursivamente si no existen
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(`✅ Directorio creado: ${normalizedPath}`);
    }
    
    return { success: true, path: normalizedPath };
  } catch (error: any) {
    return { success: false, path: uri, error: error.message };
  }
}

// ============================================
// ESTADO GLOBAL
// ============================================

let lancedbModule: any = null;
let lancedbLoadError: string | null = null;
let isModuleLoaded = false;

// Estado de la base de datos
let db: any = null;
let isInitialized = false;
let currentUri: string | null = null;

// ============================================
// CARGA DE MÓDULO NATIVO
// ============================================

/**
 * Intenta cargar el módulo de LanceDB
 * Retorna true si se cargó correctamente, false si hubo error
 */
async function loadLanceDBModule(): Promise<boolean> {
  if (isModuleLoaded) {
    return lancedbModule !== null;
  }
  
  isModuleLoaded = true;
  
  try {
    // Intentar importar LanceDB dinámicamente
    lancedbModule = await import('@lancedb/lancedb');
    console.log('✅ LanceDB module loaded successfully');
    return true;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    lancedbLoadError = errorMsg;
    console.error('❌ Error loading LanceDB module:', errorMsg);
    return false;
  }
}

/**
 * Verifica si LanceDB está disponible
 */
export async function isLanceDBAvailable(): Promise<{ available: boolean; error?: string }> {
  const loaded = await loadLanceDBModule();
  return {
    available: loaded,
    error: loaded ? undefined : lancedbLoadError || 'Unknown error'
  };
}

// ============================================
// OPERACIONES DE BASE DE DATOS
// ============================================

/**
 * Obtiene información del sistema
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const { available, error } = await isLanceDBAvailable();
  
  return {
    platform: getPlatform(),
    isWindows: isWindows(),
    isLinux: isLinux(),
    isMacOS: isMacOS(),
    currentUri: currentUri,
    isInitialized: isInitialized && db !== null,
    lancedbAvailable: available,
    lancedbError: error
  };
}

/**
 * Inicializa la conexión a LanceDB
 */
export async function initLanceDB(uri?: string): Promise<ConnectionResult> {
  const dbUri = uri || process.env.LANCEDB_URI || getDefaultLanceDBPath();
  
  // Verificar si el módulo está disponible
  const { available, error } = await isLanceDBAvailable();
  
  if (!available) {
    return {
      success: false,
      connected: false,
      message: 'LanceDB no está disponible en este sistema',
      error: error,
      suggestion: getErrorSuggestion(error || ''),
      systemInfo: await getSystemInfo()
    };
  }
  
  // Si ya está inicializado con la misma URI, retornar éxito
  if (isInitialized && db && currentUri === dbUri) {
    return {
      success: true,
      connected: true,
      message: 'LanceDB ya está inicializado',
      systemInfo: await getSystemInfo()
    };
  }
  
  try {
    console.log(`🔧 Inicializando LanceDB...`);
    console.log(`   Plataforma: ${getPlatform()}`);
    console.log(`   URI: ${dbUri}`);
    
    // Asegurar que el directorio existe
    const dirResult = ensureLanceDBDirectory(dbUri);
    if (!dirResult.success) {
      return {
        success: false,
        connected: false,
        message: `No se pudo crear/verificar el directorio: ${dirResult.error}`,
        error: dirResult.error,
        suggestion: isWindows()
          ? 'Ejecuta como administrador o cambia la ubicación.'
          : 'Verifica los permisos con chmod.',
        systemInfo: await getSystemInfo()
      };
    }
    
    // Conectar a LanceDB
    const normalizedUri = dirResult.path;
    db = await lancedbModule.connect(normalizedUri);
    
    isInitialized = true;
    currentUri = dbUri;
    
    console.log('✅ LanceDB conectado exitosamente');
    
    return {
      success: true,
      connected: true,
      message: 'LanceDB conectado exitosamente',
      systemInfo: await getSystemInfo(),
      directoryInfo: {
        path: normalizedUri,
        exists: true,
        writable: true
      }
    };
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error('❌ Error al inicializar LanceDB:', errorMsg);
    
    isInitialized = false;
    db = null;
    currentUri = null;
    
    return {
      success: false,
      connected: false,
      message: `Error al conectar: ${errorMsg}`,
      error: errorMsg,
      suggestion: getErrorSuggestion(errorMsg),
      systemInfo: await getSystemInfo()
    };
  }
}

/**
 * Cierra la conexión a LanceDB
 */
export async function closeLanceDB(): Promise<void> {
  if (db) {
    try {
      await db.close();
      console.log('✅ LanceDB cerrado correctamente');
    } catch (error) {
      console.warn('⚠️  Error al cerrar LanceDB:', error);
    }
  }
  
  db = null;
  isInitialized = false;
  currentUri = null;
}

/**
 * Obtiene estadísticas de la base de datos
 */
export async function getDBStats(): Promise<DBStats> {
  if (!db || !isInitialized) {
    return {
      totalEmbeddings: 0,
      totalNamespaces: 0,
      embeddingsByNamespace: {},
      embeddingsBySourceType: {}
    };
  }
  
  try {
    // Obtener lista de tablas
    const tables = await db.tableNames();
    
    let totalEmbeddings = 0;
    const embeddingsByNamespace: Record<string, number> = {};
    const embeddingsBySourceType: Record<string, number> = {};
    
    for (const tableName of tables) {
      try {
        const table = await db.openTable(tableName);
        const rows = await table.execute();
        const count = rows.length;
        
        if (tableName === 'embeddings') {
          totalEmbeddings = count;
          // Analizar namespaces y source types
          rows.forEach((row: any) => {
            const ns = row.namespace || 'default';
            embeddingsByNamespace[ns] = (embeddingsByNamespace[ns] || 0) + 1;
            
            if (row.source_type) {
              embeddingsBySourceType[row.source_type] = (embeddingsBySourceType[row.source_type] || 0) + 1;
            }
          });
        }
      } catch (e) {
        console.warn(`⚠️  Error al leer tabla ${tableName}:`, e);
      }
    }
    
    return {
      totalEmbeddings,
      totalNamespaces: Object.keys(embeddingsByNamespace).length,
      embeddingsByNamespace,
      embeddingsBySourceType
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      totalEmbeddings: 0,
      totalNamespaces: 0,
      embeddingsByNamespace: {},
      embeddingsBySourceType: {}
    };
  }
}

/**
 * Prueba completa de conexión
 */
export async function testLanceDBConnection(requestedPath?: string): Promise<ConnectionResult> {
  const dbUri = requestedPath || process.env.LANCEDB_URI || getDefaultLanceDBPath();
  
  // Verificar disponibilidad del módulo primero
  const { available, error } = await isLanceDBAvailable();
  
  if (!available) {
    return {
      success: true, // El endpoint funciona, pero LanceDB no está disponible
      connected: false,
      message: 'LanceDB no está disponible en este sistema',
      error: error,
      suggestion: getErrorSuggestion(error || ''),
      systemInfo: await getSystemInfo()
    };
  }
  
  // Normalizar ruta
  const normalizedPath = normalizePath(dbUri);
  
  // Verificar/crear directorio
  const permissions = checkDirectoryPermissions(normalizedPath);
  
  if (!permissions.writable && !permissions.exists) {
    // Intentar crear el directorio
    const dirResult = ensureLanceDBDirectory(normalizedPath);
    if (!dirResult.success) {
      return {
        success: true,
        connected: false,
        message: `Error con el directorio: ${dirResult.error}`,
        error: dirResult.error,
        suggestion: isWindows()
          ? 'Verifica que la ruta sea válida y tengas permisos de escritura.'
          : 'Verifica los permisos del directorio.',
        systemInfo: await getSystemInfo(),
        directoryInfo: {
          path: normalizedPath,
          exists: false,
          writable: false
        }
      };
    }
  }
  
  // Cerrar conexión anterior si existe con otra ruta
  if (isInitialized && currentUri !== normalizedPath) {
    await closeLanceDB();
  }
  
  // Inicializar LanceDB
  const initResult = await initLanceDB(normalizedPath);
  
  if (!initResult.connected) {
    return {
      ...initResult,
      directoryInfo: {
        path: normalizedPath,
        exists: permissions.exists,
        writable: permissions.writable
      }
    };
  }
  
  // Obtener estadísticas
  const stats = await getDBStats();
  
  return {
    success: true,
    connected: true,
    message: `LanceDB conectado exitosamente. ${stats.totalEmbeddings} embeddings en ${stats.totalNamespaces} namespaces.`,
    dbStats: stats,
    systemInfo: await getSystemInfo(),
    directoryInfo: {
      path: normalizedPath,
      exists: true,
      writable: true
    }
  };
}

// ============================================
// HELPERS
// ============================================

function getErrorSuggestion(error: string): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('could not resolve') || lowerError.includes('module not found')) {
    return 'El módulo nativo de LanceDB no se pudo cargar. Verifica que tu sistema sea compatible (Linux x64, macOS ARM/x64, Windows x64).';
  }
  
  if (lowerError.includes('permission') || lowerError.includes('access')) {
    return isWindows()
      ? 'Ejecuta la aplicación como administrador o cambia la ubicación de la base de datos.'
      : 'Verifica los permisos con chmod o ejecuta con sudo.';
  }
  
  if (lowerError.includes('native') || lowerError.includes('binding')) {
    return 'Las dependencias nativas de LanceDB no están correctamente instaladas. Reinstala @lancedb/lancedb.';
  }
  
  if (lowerError.includes('enoent') || lowerError.includes('not found')) {
    return 'El directorio no existe. Se creará automáticamente.';
  }
  
  return 'Consulta la documentación o los logs para más detalles.';
}

// ============================================
// EXPORTS
// ============================================

export function getCurrentUri(): string | null {
  return currentUri;
}

export function isDBInitialized(): boolean {
  return isInitialized && db !== null;
}

export function getDB(): any {
  return db;
}

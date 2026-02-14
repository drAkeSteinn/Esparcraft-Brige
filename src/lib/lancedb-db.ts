/**
 * Cliente LanceDB para Sistema de Embeddings
 * 
 * Versión con carga dinámica para manejar errores de módulos nativos.
 * Soporte Cross-Platform: Windows, Linux, macOS
 */

import * as path from 'path';
import * as fs from 'fs';
import type { Embedding, SearchResult, RecordNamespace } from './embeddings/types';

// Re-exportar tipos para compatibilidad
export type { Embedding, SearchResult, RecordNamespace } from './embeddings/types';

// ============================================
// DETECCIÓN DE PLATAFORMA
// ============================================

export type Platform = 'win32' | 'linux' | 'darwin' | 'unknown';

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
// CONFIGURACIÓN
// ============================================

const EMBEDDINGS_TABLE = 'embeddings';
const NAMESPACES_TABLE = 'namespaces';

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
    
    if (!fs.existsSync(normalizedPath)) {
      // Verificar si el directorio padre existe
      const parentDir = path.dirname(normalizedPath);
      if (fs.existsSync(parentDir)) {
        try {
          fs.accessSync(parentDir, fs.constants.W_OK);
          return { exists: false, writable: true };
        } catch {
          return { exists: false, writable: false, error: 'No write permission on parent directory' };
        }
      }
      return { exists: false, writable: false, error: 'Directory does not exist' };
    }
    
    try {
      fs.accessSync(normalizedPath, fs.constants.W_OK);
      return { exists: true, writable: true };
    } catch {
      return { exists: true, writable: false, error: 'No write permission' };
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
    const dirPath = path.dirname(normalizedPath);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Directorio creado: ${dirPath}`);
    }
    
    // Crear el directorio de datos si no existe
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(`✅ Directorio de datos creado: ${normalizedPath}`);
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
let isModuleLoadAttempted = false;

let db: any = null;
let embeddingsTable: any = null;
let namespacesTable: any = null;
let isInitialized = false;
let currentUri: string | null = null;

// ============================================
// ERRORES ESPECÍFICOS
// ============================================

export class LanceDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform?: Platform,
    public details?: any
  ) {
    super(message);
    this.name = 'LanceDBError';
  }
  
  getSuggestion(): string {
    switch (this.code) {
      case 'PERMISSION_DENIED':
        return isWindows()
          ? 'Ejecuta la aplicación como administrador o cambia la ubicación de la base de datos.'
          : 'Verifica los permisos del directorio con chmod o ejecuta con sudo.';
      
      case 'DIRECTORY_NOT_FOUND':
        return 'El directorio no existe. Se creará automáticamente al inicializar.';
      
      case 'NATIVE_MODULE_ERROR':
        return isWindows()
          ? 'Asegúrate de tener instalado Visual C++ Redistributable. Reinstala @lancedb/lancedb.'
          : 'Verifica que tengas las dependencias nativas instaladas (glibc, etc.).';
      
      case 'CONNECTION_FAILED':
        return 'Verifica que la ruta sea accesible y que no esté bloqueada por antivirus.';
      
      case 'MODULE_NOT_AVAILABLE':
        return 'LanceDB no está disponible en este sistema. Verifica la compatibilidad de tu plataforma.';
      
      case 'TABLE_NOT_FOUND':
        return 'La tabla no existe. Se creará automáticamente en la primera operación.';
      
      default:
        return 'Consulta la documentación o los logs para más detalles.';
    }
  }
}

// ============================================
// CARGA DINÁMICA DEL MÓDULO
// ============================================

/**
 * Carga el módulo de LanceDB de forma dinámica
 */
async function loadLanceDBModule(): Promise<{ success: boolean; error?: string }> {
  if (isModuleLoadAttempted) {
    return { success: lancedbModule !== null, error: lancedbLoadError || undefined };
  }
  
  isModuleLoadAttempted = true;
  
  try {
    // Usar import dinámico para manejar errores de carga
    lancedbModule = await import('@lancedb/lancedb');
    console.log('✅ LanceDB module loaded successfully');
    return { success: true };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    lancedbLoadError = errorMsg;
    console.error('❌ Error loading LanceDB module:', errorMsg);
    
    // Detectar tipo de error
    if (errorMsg.includes('could not resolve') || errorMsg.includes('module not found')) {
      console.error('   El módulo nativo de LanceDB no se pudo cargar para esta plataforma.');
    }
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Verifica si LanceDB está disponible
 */
export async function isLanceDBAvailable(): Promise<{ available: boolean; error?: string }> {
  const result = await loadLanceDBModule();
  return {
    available: result.success,
    error: result.error
  };
}

// ============================================
// INICIALIZACIÓN
// ============================================

export async function initLanceDB(uri?: string): Promise<void> {
  const dbUri = uri || process.env.LANCEDB_URI || getDefaultLanceDBPath();
  
  if (isInitialized && db && currentUri === dbUri) {
    console.log('ℹ️  LanceDB ya está inicializado');
    return;
  }
  
  // Cerrar conexión anterior si existe
  if (db) {
    await closeLanceDB();
  }
  
  // Cargar módulo dinámicamente
  const { success, error } = await loadLanceDBModule();
  
  if (!success) {
    throw new LanceDBError(
      `LanceDB no está disponible: ${error}`,
      'MODULE_NOT_AVAILABLE',
      getPlatform(),
      { uri: dbUri, originalError: error }
    );
  }
  
  isInitialized = true;
  currentUri = dbUri;
  
  try {
    console.log(`🔧 Inicializando LanceDB...`);
    console.log(`   Plataforma: ${getPlatform()}`);
    console.log(`   URI: ${dbUri}`);
    
    const dirResult = ensureLanceDBDirectory(dbUri);
    if (!dirResult.success) {
      throw new LanceDBError(
        `No se pudo crear/verificar el directorio: ${dirResult.error}`,
        'DIRECTORY_ERROR',
        getPlatform(),
        { uri: dbUri }
      );
    }
    
    const normalizedUri = dirResult.path;
    db = await lancedbModule.connect(normalizedUri);
    console.log('✅ LanceDB conectado exitosamente');
    
    await initializeTables();
    
  } catch (error: any) {
    isInitialized = false;
    db = null;
    currentUri = null;
    
    // Si es un LanceDBError, relanzarlo
    if (error instanceof LanceDBError) {
      throw error;
    }
    
    const lancedbError = classifyError(error, dbUri);
    console.error('❌ Error al inicializar LanceDB:', lancedbError.message);
    console.error('   Sugerencia:', lancedbError.getSuggestion());
    
    throw lancedbError;
  }
}

async function initializeTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    embeddingsTable = await db.openTable(EMBEDDINGS_TABLE);
    console.log('✅ Tabla embeddings abierta');
  } catch {
    console.log('ℹ️  Creando tabla embeddings...');
    embeddingsTable = await db.createTable(EMBEDDINGS_TABLE, []);
    console.log('✅ Tabla embeddings creada');
  }
  
  try {
    namespacesTable = await db.openTable(NAMESPACES_TABLE);
    console.log('✅ Tabla namespaces abierta');
  } catch {
    console.log('ℹ️  Creando tabla namespaces...');
    namespacesTable = await db.createTable(NAMESPACES_TABLE, []);
    console.log('✅ Tabla namespaces creada');
  }
}

function classifyError(error: any, uri: string): LanceDBError {
  const message = error.message || String(error);
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('permission') || lowerMessage.includes('access denied')) {
    return new LanceDBError(message, 'PERMISSION_DENIED', getPlatform(), { uri, originalError: error });
  }
  
  if (lowerMessage.includes('no such file') || lowerMessage.includes('not found')) {
    return new LanceDBError(message, 'DIRECTORY_NOT_FOUND', getPlatform(), { uri, originalError: error });
  }
  
  if (lowerMessage.includes('native') || lowerMessage.includes('module') || lowerMessage.includes('binding')) {
    return new LanceDBError(message, 'NATIVE_MODULE_ERROR', getPlatform(), { uri, originalError: error });
  }
  
  if (lowerMessage.includes('connection') || lowerMessage.includes('connect')) {
    return new LanceDBError(message, 'CONNECTION_FAILED', getPlatform(), { uri, originalError: error });
  }
  
  return new LanceDBError(message, 'UNKNOWN_ERROR', getPlatform(), { uri, originalError: error });
}

// ============================================
// GETTERS
// ============================================

export async function getEmbeddingsTable(): Promise<any> {
  if (!db || !isInitialized) {
    await initLanceDB();
  }
  if (!embeddingsTable) {
    throw new LanceDBError('Tabla de embeddings no inicializada', 'TABLE_NOT_FOUND');
  }
  return embeddingsTable;
}

export async function getNamespacesTable(): Promise<any> {
  if (!db || !isInitialized) {
    await initLanceDB();
  }
  if (!namespacesTable) {
    throw new LanceDBError('Tabla de namespaces no inicializada', 'TABLE_NOT_FOUND');
  }
  return namespacesTable;
}

export function getDB(): any {
  return db;
}

export function getCurrentUri(): string | null {
  return currentUri;
}

export function isDBInitialized(): boolean {
  return isInitialized && db !== null;
}

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
  embeddingsTable = null;
  namespacesTable = null;
  isInitialized = false;
  currentUri = null;
}

// ============================================
// BACKUP Y MIGRACIÓN
// ============================================

export interface BackupData {
  version: string;
  platform: Platform;
  timestamp: string;
  embeddings: any[];
  namespaces: any[];
  metadata: {
    totalEmbeddings: number;
    totalNamespaces: number;
    uri: string;
  };
}

export async function exportToJSON(): Promise<BackupData> {
  if (!isInitialized || !db) {
    await initLanceDB();
  }
  
  const embTable = await getEmbeddingsTable();
  const nsTable = await getNamespacesTable();
  
  const embeddings = await embTable.execute();
  const namespaces = await nsTable.execute();
  
  const backup: BackupData = {
    version: '1.0.0',
    platform: getPlatform(),
    timestamp: new Date().toISOString(),
    embeddings: embeddings.map((row: any) => ({
      id: row.id,
      content: row.content,
      vector: row.vector,
      metadata: row.metadata,
      namespace: row.namespace,
      source_type: row.source_type,
      source_id: row.source_id,
      model_name: row.model_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    })),
    namespaces: namespaces.map((row: any) => ({
      id: row.id,
      namespace: row.namespace,
      description: row.description,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    })),
    metadata: {
      totalEmbeddings: embeddings.length,
      totalNamespaces: namespaces.length,
      uri: currentUri || 'unknown'
    }
  };
  
  console.log(`✅ Backup exportado: ${embeddings.length} embeddings, ${namespaces.length} namespaces`);
  return backup;
}

export async function importFromJSON(backup: BackupData, options?: {
  clearExisting?: boolean;
  merge?: boolean;
}): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { clearExisting = false, merge = true } = options || {};
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  
  try {
    if (!isInitialized || !db) {
      await initLanceDB();
    }
    
    if (clearExisting) {
      console.log('🗑️  Limpiando datos existentes...');
      const embTable = await getEmbeddingsTable();
      const nsTable = await getNamespacesTable();
      
      const existingEmbeddings = await embTable.execute();
      for (const emb of existingEmbeddings) {
        await embTable.delete(`id = '${emb.id}'`);
      }
      
      const existingNamespaces = await nsTable.execute();
      for (const ns of existingNamespaces) {
        await nsTable.delete(`namespace = '${ns.namespace}'`);
      }
    }
    
    const nsTable = await getNamespacesTable();
    if (backup.namespaces && backup.namespaces.length > 0) {
      for (const ns of backup.namespaces) {
        try {
          if (merge) {
            const existing = await nsTable.filter(`namespace = '${ns.namespace}'`).execute();
            if (existing.length > 0) {
              skipped++;
              continue;
            }
          }
          
          await nsTable.add([{
            ...ns,
            created_at: ns.created_at ? new Date(ns.created_at) : new Date(),
            updated_at: new Date()
          }]);
          imported++;
        } catch (error: any) {
          errors.push(`Namespace ${ns.namespace}: ${error.message}`);
        }
      }
    }
    
    const embTable = await getEmbeddingsTable();
    if (backup.embeddings && backup.embeddings.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < backup.embeddings.length; i += batchSize) {
        const batch = backup.embeddings.slice(i, i + batchSize);
        
        try {
          if (merge) {
            const existingIds = new Set(
              (await embTable.execute()).map((e: any) => e.id)
            );
            const newBatch = batch.filter(emb => !existingIds.has(emb.id));
            skipped += batch.length - newBatch.length;
            
            if (newBatch.length > 0) {
              await embTable.add(newBatch.map(emb => ({
                ...emb,
                created_at: emb.created_at ? new Date(emb.created_at) : new Date(),
                updated_at: new Date()
              })));
              imported += newBatch.length;
            }
          } else {
            await embTable.add(batch.map(emb => ({
              ...emb,
              created_at: emb.created_at ? new Date(emb.created_at) : new Date(),
              updated_at: new Date()
            })));
            imported += batch.length;
          }
          
          console.log(`📦 Importados ${Math.min(i + batchSize, backup.embeddings.length)}/${backup.embeddings.length} embeddings`);
        } catch (error: any) {
          errors.push(`Batch ${i}-${i + batchSize}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Importación completada: ${imported} importados, ${skipped} omitidos, ${errors.length} errores`);
    return { imported, skipped, errors };
    
  } catch (error: any) {
    errors.push(`Error general: ${error.message}`);
    return { imported, skipped, errors };
  }
}

// ============================================
// CLASE WRAPPER
// ============================================

export class LanceDBWrapper {
  static async checkConnection(): Promise<boolean> {
    try {
      if (!db) {
        await initLanceDB();
      }
      return db !== null;
    } catch (error) {
      console.error('Error al conectar a LanceDB:', error);
      return false;
    }
  }

  static getSystemInfo(): {
    platform: Platform;
    isWindows: boolean;
    isLinux: boolean;
    isMacOS: boolean;
    currentUri: string | null;
    isInitialized: boolean;
  } {
    return {
      platform: getPlatform(),
      isWindows: isWindows(),
      isLinux: isLinux(),
      isMacOS: isMacOS(),
      currentUri: getCurrentUri(),
      isInitialized: isDBInitialized()
    };
  }

  static async insertEmbedding(params: {
    content: string;
    vector: number[];
    metadata?: Record<string, any>;
    namespace?: string;
    source_type?: string;
    source_id?: string;
    model_name?: string;
  }): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    const {
      content,
      vector,
      metadata = {},
      namespace = 'default',
      source_type,
      source_id,
      model_name = process.env.EMBEDDING_MODEL || 'nomic-embed-text'
    } = params;

    try {
      const table = await getEmbeddingsTable();

      const embedding = {
        id: uuidv4(),
        content,
        vector,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          source_type,
          source_id
        },
        namespace,
        source_type,
        source_id,
        model_name,
        created_at: new Date(),
        updated_at: new Date()
      };

      await table.add([embedding]);
      console.log(`✅ Embedding insertado: ${embedding.id}`);
      return embedding.id;
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      console.error('Error al insertar embedding:', lancedbError.message);
      throw lancedbError;
    }
  }

  static async searchSimilar(params: {
    queryVector: number[];
    namespace?: string;
    limit?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const {
      queryVector,
      namespace,
      limit = 10,
      threshold = parseFloat(process.env.DEFAULT_SIMILARITY_THRESHOLD || '0.7')
    } = params;

    try {
      const table = await getEmbeddingsTable();

      let results: any[];

      if (namespace && namespace !== 'default') {
        try {
          const namespaceTable = await db!.openTable(namespace);
          const searchResults = await namespaceTable
            .search(queryVector)
            .limit(limit)
            .execute();

          results = searchResults.map(row => ({
            ...row,
            similarity: 1 - (row._distance || 0)
          })).filter((r: any) => r.similarity >= threshold);
        } catch {
          console.log(`ℹ️  Tabla de namespace "${namespace}" no existe`);
          results = [];
        }
      } else {
        const allResults = await table
          .search(queryVector)
          .limit(limit * 10)
          .execute();

        results = allResults
          .map((row: any) => ({
            ...row,
            similarity: 1 - (row._distance || 0)
          }))
          .filter((r: any) =>
            (r.namespace || 'default') === namespace &&
            r.similarity >= threshold
          )
          .slice(0, limit);
      }

      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || 'default',
        source_type: row.source_type,
        source_id: row.source_id,
        similarity: row.similarity
      }));
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      console.error('Error al buscar embeddings:', lancedbError.message);
      throw lancedbError;
    }
  }

  static async getEmbeddingById(id: string): Promise<Embedding | null> {
    try {
      const table = await getEmbeddingsTable();
      const results = await table.filter(`id = '${id}'`).execute();

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        content: row.content,
        metadata: row.metadata || {},
        namespace: row.namespace || 'default',
        source_type: row.source_type,
        source_id: row.source_id,
        model_name: row.model_name,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async deleteEmbedding(id: string): Promise<boolean> {
    try {
      const table = await getEmbeddingsTable();
      await table.delete(`id = '${id}'`);
      console.log(`✅ Embedding eliminado: ${id}`);
      return true;
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async deleteBySource(source_type: string, source_id: string): Promise<number> {
    try {
      const table = await getEmbeddingsTable();
      await table.delete(`source_type = '${source_type}' AND source_id = '${source_id}'`);
      console.log(`✅ Embeddings eliminados para ${source_type}:${source_id}`);
      return 1;
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async upsertNamespace(params: {
    namespace: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<RecordNamespace> {
    const { v4: uuidv4 } = await import('uuid');
    const { namespace, description, metadata = {} } = params;

    try {
      const table = await getNamespacesTable();
      const existing = await table.filter(`namespace = '${namespace}'`).execute();

      const nsRecord = {
        id: uuidv4(),
        namespace,
        description,
        metadata: JSON.stringify(metadata),
        created_at: existing.length > 0 ? existing[0].created_at : new Date(),
        updated_at: new Date()
      };

      if (existing.length > 0) {
        await table.delete(`namespace = '${namespace}'`);
        await table.add([nsRecord]);
        console.log(`✅ Namespace actualizado: ${namespace}`);
      } else {
        await table.add([nsRecord]);
        console.log(`✅ Namespace creado: ${namespace}`);

        try {
          await db!.createTable(namespace, []);
          console.log(`✅ Tabla creada para namespace: ${namespace}`);
        } catch (tableError) {
          console.log(`ℹ️  Tabla "${namespace}" ya existe o error al crear`);
        }
      }

      return {
        id: nsRecord.id,
        namespace: nsRecord.namespace,
        description: nsRecord.description,
        metadata: JSON.parse(nsRecord.metadata),
        created_at: nsRecord.created_at,
        updated_at: nsRecord.updated_at
      };
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async getAllNamespaces(): Promise<RecordNamespace[]> {
    try {
      const table = await getNamespacesTable();
      const results = await table.execute();

      return results.map((row: any) => ({
        id: row.id,
        namespace: row.namespace,
        description: row.description,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async deleteNamespace(namespace: string): Promise<boolean> {
    try {
      const table = await getNamespacesTable();
      await table.delete(`namespace = '${namespace}'`);

      try {
        await db!.dropTable(namespace);
        console.log(`✅ Namespace eliminado: ${namespace}`);
        return true;
      } catch {
        console.log(`ℹ️  Tabla "${namespace}" no existe`);
        return false;
      }
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static async getStats(): Promise<{
    totalEmbeddings: number;
    totalNamespaces: number;
    embeddingsByNamespace: Record<string, number>;
    embeddingsBySourceType: Record<string, number>;
  }> {
    try {
      const table = await getEmbeddingsTable();
      const allEmbeddings = await table.execute();
      const totalEmbeddings = allEmbeddings.length;
      const namespaces = await this.getAllNamespaces();
      const totalNamespaces = namespaces.length;

      const embeddingsByNamespace: Record<string, number> = {};
      allEmbeddings.forEach((row: any) => {
        const ns = row.namespace || 'default';
        embeddingsByNamespace[ns] = (embeddingsByNamespace[ns] || 0) + 1;
      });

      const embeddingsBySourceType: Record<string, number> = {};
      allEmbeddings.forEach((row: any) => {
        if (row.source_type) {
          embeddingsBySourceType[row.source_type] = (embeddingsBySourceType[row.source_type] || 0) + 1;
        }
      });

      return {
        totalEmbeddings,
        totalNamespaces,
        embeddingsByNamespace,
        embeddingsBySourceType
      };
    } catch (error: any) {
      const lancedbError = classifyError(error, currentUri || 'unknown');
      throw lancedbError;
    }
  }

  static exportToJSON = exportToJSON;
  static importFromJSON = importFromJSON;
  
  static async saveBackupToFile(filePath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const backup = await exportToJSON();
      const backupPath = filePath || path.join(
        process.cwd(),
        'backups',
        `lancedb_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      
      const dir = path.dirname(backupPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup guardado en: ${backupPath}`);
      
      return { success: true, path: backupPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  static async loadBackupFromFile(filePath: string, options?: {
    clearExisting?: boolean;
    merge?: boolean;
  }): Promise<{ success: boolean; imported?: number; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const backup: BackupData = JSON.parse(content);
      
      if (!backup.version || !backup.embeddings) {
        return { success: false, error: 'Invalid backup file format' };
      }
      
      const result = await importFromJSON(backup, options);
      
      return { success: true, imported: result.imported };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export default LanceDBWrapper;

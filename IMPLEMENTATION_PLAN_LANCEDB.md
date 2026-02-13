# Plan de Implementación: Migración a LanceDB y Eliminación de TextGen WebUI

## 📋 Resumen Ejecutivo

**Objetivo Principal:**
1. Simplificar el sistema de embeddings eliminando Text Generation WebUI como proveedor
2. Migrar el almacenamiento de embeddings de PostgreSQL + pgvector a LanceDB
3. Mantener compatibilidad con todas las funcionalidades existentes

**Impacto:**
- ✅ Simplificación del sistema (menos dependencias externas)
- ✅ Mejor rendimiento (LanceDB está optimizado para búsquedas vectoriales)
- ✅ Menos configuración (sin servidor PostgreSQL)
- ✅ Portabilidad (datos en archivos locales)

---

## 🗺️ Arquitectura Actual vs Propuesta

### Arquitectura Actual
```
┌─────────────────────────────────────────────┐
│   EmbeddingClient (client.ts)             │
│   - Proveedor: textgen | ollama          │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────────┐
│ TextGen    │  │   Ollama       │
│ Client     │  │   Client       │
└─────────────┘  └────────┬────────┘
                        │
                        ▼
               ┌──────────────────────┐
               │   EmbeddingsDB     │
               │   (PostgreSQL +    │
               │    pgvector)       │
               └──────────────────────┘
```

### Arquitectura Propuesta
```
┌─────────────────────────────────────────────┐
│   EmbeddingClient (client.ts)             │
│   - Proveedor: ollama (únicamente)       │
│   - DB: lancedb (por defecto)            │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │   Ollama    │
        │   Client    │
        └──────┬─────┘
               │
               ▼
        ┌──────────────────────┐
        │   LanceDBWrapper   │
        │   (lancedb-db.ts)  │
        └──────────┬─────────┘
                   │
                   ▼
            ┌──────────────┐
            │   LanceDB   │
            │   (Archivos) │
            └──────────────┘
```

---

## 📦 FASE 1: Análisis y Preparación

### 1.1 Revisión de Dependencias Actuales
**Archivos a modificar:**
- `/src/lib/embeddings/text-gen-client.ts` → **ELIMINAR**
- `/src/lib/embeddings/ollama-client.ts` → **MANTENER**
- `/src/lib/embeddings/client.ts` → **MODIFICAR** (eliminar soporte textgen)
- `/src/lib/embeddings-db.ts` → **MANTENER** (por seguridad)
- `/src/lib/lancedb-db.ts` → **CREAR** (nuevo wrapper)
- `/src/components/dashboard/settings/EmbeddingsConfig.tsx` → **MODIFICAR**
- `/src/components/dashboard/settings/PostgresConfig.tsx` → **ELIMINAR**
- `/src/components/dashboard/settings/LanceDBConfig.tsx` → **CREAR**
- `/src/components/dashboard/SettingsTab.tsx` → **MODIFICAR**

**Rutas API afectadas:**
- `/api/settings/test-embeddings` → **ELIMINAR** (TextGen)
- `/api/settings/apply-postgres` → **ELIMINAR**
- `/api/settings/test-postgres` → **ELIMINAR**
- `/api/settings/test-lancedb` → **CREAR**
- `/api/settings/apply-lancedb` → **CREAR**
- `/api/settings/ollama-models` → **MANTENER**

### 1.2 Dependencias a Instalar
```bash
bun add @lancedb/lancedb
```

### 1.3 Dependencias a Desinstalar (Opcional)
```bash
# Solo si no se usa pg en otra parte del proyecto
bun remove pg @types/pg
```

---

## 🗑️ FASE 2: Eliminar Text Generation WebUI

### 2.1 Modificar `src/lib/embeddings/client.ts`
**Cambios:**
- Eliminar importación de `TextGenWebUIEmbeddingClient`
- Eliminar propiedad `textGenClient`
- Eliminar `type EmbeddingProvider` (solo será ollama)
- Simplificar constructor para solo aceptar Ollama
- Eliminar `setProvider()` (ya no cambia proveedor)
- Eliminar `getProvider()` (ya no cambia proveedor)
- Actualizar `getActiveClient()` para siempre retornar Ollama

**Código a eliminar:**
```typescript
import { TextGenWebUIEmbeddingClient } from './text-gen-client';
import { OllamaEmbeddingClient } from './ollama-client';
type EmbeddingProvider = 'textgen' | 'ollama';

private textGenClient: TextGenWebUIEmbeddingClient;
private ollamaClient: OllamaEmbeddingClient;
private provider: EmbeddingProvider;

constructor(provider: EmbeddingProvider = 'textgen', config?: any) {
  this.provider = provider;
  this.textGenClient = new TextGenWebUIEmbeddingClient(config);
  this.ollamaClient = new OllamaEmbeddingClient(config);
}

setProvider(provider: EmbeddingProvider, config?: any): void { ... }
getProvider(): EmbeddingProvider { ... }
```

**Código nuevo:**
```typescript
import { OllamaEmbeddingClient } from './ollama-client';

export class EmbeddingClient {
  private ollamaClient: OllamaEmbeddingClient;
  private db: PostgresDB | LanceDB; // Phase 4

  constructor(config?: any) {
    this.ollamaClient = new OllamaEmbeddingClient(config);
    // Phase 4: this.db = new LanceDB();
  }

  private getActiveClient() {
    return this.ollamaClient;
  }
  // Eliminar setProvider y getProvider
}
```

### 2.2 Modificar `src/lib/embeddings/types.ts`
**Cambios:**
- Eliminar `textGenWebUIUrl` de `EmbeddingConfig`
- Simplificar a solo configuración de Ollama

**Antes:**
```typescript
export interface EmbeddingConfig {
  textGenWebUIUrl: string;  // Eliminar
  model: string;
  dimension: number;
  batchSize: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}
```

**Después:**
```typescript
export interface EmbeddingConfig {
  ollamaUrl: string;
  model: string;
  dimension: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}
```

### 2.3 Modificar `src/components/dashboard/settings/EmbeddingsConfig.tsx`
**Cambios:**
- Eliminar `type EmbeddingProvider = 'textgen' | 'ollama'`
- Eliminar `interface TextGenConfig`
- Eliminar estado `provider: 'textgen'`
- Eliminar todos los campos de TextGen del formulario
- Eliminar selector de proveedor
- Eliminar constante `TEXTGEN_MODELS`
- Eliminar lógica de cambio de proveedor

**Código a eliminar:**
```typescript
type EmbeddingProvider = 'textgen' | 'ollama';

interface TextGenConfig {
  textGenWebUIUrl: string;
  embeddingModel: string;
  embeddingDimension: string;
  batchSize: string;
  timeout: string;
}

interface OllamaConfig { ... }

const TEXTGEN_MODELS = [
  { name: 'all-MiniLM-L6-v2', dimension: '384' },
  // ...
];

<Select value={config.provider}>
  <SelectItem value="textgen">Text Generation WebUI</SelectItem>
  <SelectItem value="ollama">Ollama</SelectItem>
</Select>
```

**Resultado:**
```typescript
export default function EmbeddingsConfig({ onConfigSaved }: EmbeddingsConfigProps) {
  const [config, setConfig] = useState<OllamaConfig>({
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'nomic-embed-text',
    embeddingDimension: '768',
    timeout: '30'
  });

  // Eliminar isOllama, ya siempre es Ollama
  // Simplificar el formulario a solo campos de Ollama
}
```

### 2.4 Eliminar Archivos de TextGen
```bash
rm /src/lib/embeddings/text-gen-client.ts
```

### 2.5 Eliminar Rutas API de TextGen
```bash
rm /src/app/api/settings/test-embeddings/route.ts  # Si existe para textgen
```

---

## 🚀 FASE 3: Instalar y Configurar LanceDB

### 3.1 Instalar Dependencia
```bash
bun add @lancedb/lancedb
```

### 3.2 Crear Directorio para Datos
```bash
mkdir -p data/lancedb
```

### 3.3 Variables de Entorno (Opcional)
Agregar a `.env.local`:
```env
LANCEDB_URI=./data/lancedb
LANCEDB_EMBEDDINGS_TABLE=embeddings
LANCEDB_NAMESPACES_TABLE=namespaces
```

---

## 💾 FASE 4: Crear Wrapper de LanceDB

### 4.1 Crear `src/lib/lancedb-db.ts`

**Estructura de LanceDB:**
```
data/lancedb/
├── embeddings/          # Tabla principal de embeddings
│   ├── _versions/
│   └── ...
├── npc_cards/          # Namespace para NPCs
├── world_lore/         # Namespace para Mundos
├── session_summaries/   # Namespace para Sesiones
└── namespaces/         # Tabla de metadatos de namespaces
```

**Schema de Tabla de Embeddings:**
```typescript
{
  id: string,
  content: string,
  vector: fixed_size_list[dimension],  // vector de embeddings
  metadata: struct<...>,
  source_type: string,  // 'world', 'pueblo', 'edificio', 'npc', 'session', 'custom'
  source_id: string,    // ID de la entidad de origen
  model_name: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Schema de Tabla de Namespaces:**
```typescript
{
  id: string,
  namespace: string,
  description: string,
  metadata: struct<...>,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Clase Principal:**
```typescript
export class LanceDBWrapper {
  private db: LanceDB;
  private embeddingsTable: Table;
  private namespacesTable: Table;

  // Constructor: inicializar LanceDB y abrir tablas
  constructor(uri: string = './data/lancedb') { ... }

  // Métodos CRUD de embeddings
  static async insertEmbedding(params: {...}): Promise<string> { ... }
  static async searchSimilar(params: {...}): Promise<SearchResult[]> { ... }
  static async getEmbeddingById(id: string): Promise<Embedding | null> { ... }
  static async deleteEmbedding(id: string): Promise<boolean> { ... }
  static async deleteBySource(source_type: string, source_id: string): Promise<number> { ... }
  static async updateEmbedding(id: string, content: string, metadata?: any): Promise<void> { ... }

  // Métodos de namespaces
  static async upsertNamespace(params: {...}): Promise<RecordNamespace> { ... }
  static async deleteNamespace(namespace: string): Promise<boolean> { ... }
  static async getAllNamespaces(): Promise<RecordNamespace[]> { ... }

  // Métodos de utilidad
  static async checkConnection(): Promise<boolean> { ... }
  static async getStats(): Promise<EmbeddingStats> { ... }
  static async close(): Promise<void> { ... }
}
```

**Implementación de búsqueda vectorial:**
```typescript
static async searchSimilar(params: {
  queryVector: number[];
  namespace?: string;
  limit?: number;
  threshold?: number;
}): Promise<SearchResult[]> {
  const { queryVector, namespace, limit = 10, threshold = 0.7 } = params;

  // Si hay namespace, buscar en tabla específica
  if (namespace && namespace !== 'default') {
    const table = await this.db.openTable(namespace);
    const results = await table.search(queryVector).limit(limit).execute();

    return results.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      namespace,
      similarity: row._distance,  // LanceDB retorna distancia
      source_type: row.source_type,
      source_id: row.source_id
    })).filter(r => (1 - r.similarity) >= threshold);  // Convertir distancia a similitud
  }

  // Buscar en tabla principal
  const results = await this.embeddingsTable
    .search(queryVector)
    .limit(limit)
    .execute();

  return results.map(row => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata,
    namespace: row.namespace || 'default',
    similarity: 1 - row._distance,
    source_type: row.source_type,
    source_id: row.source_id
  })).filter(r => r.similarity >= threshold);
}
```

---

## 🔌 FASE 5: Integrar LanceDB en EmbeddingClient

### 5.1 Modificar `src/lib/embeddings/client.ts`

**Antes:**
```typescript
import { EmbeddingsDB } from '../embeddings-db';

export class EmbeddingClient {
  private db = EmbeddingsDB;
  // ...
}
```

**Después:**
```typescript
import { LanceDBWrapper } from '../lancedb-db';

export class EmbeddingClient {
  private db: LanceDBWrapper;  // Usar LanceDB por defecto

  constructor(config?: any) {
    this.ollamaClient = new OllamaEmbeddingClient(config);
    this.db = new LanceDBWrapper();  // Inicializar LanceDB
  }

  // Eliminar métodos de cambio de proveedor
  // Eliminar checkConnections (solo ollama + lancedb)

  async checkConnections(): Promise<{
    db: boolean;
    ollama: boolean;
  }> {
    const [db, ollama] = await Promise.all([
      LanceDBWrapper.checkConnection(),
      this.ollamaClient.checkConnection()
    ]);

    return { db, ollama };
  }
}
```

**Compatibilidad con código existente:**
- Todos los métodos de `EmbeddingClient` mantienen la misma interfaz
- Las rutas API no necesitan cambios
- Los componentes que usan embeddings no necesitan cambios

---

## 🎨 FASE 6: Crear UI de Configuración para LanceDB

### 6.1 Crear `src/components/dashboard/settings/LanceDBConfig.tsx`

**Propósito:** Configuración de LanceDB (ruta de almacenamiento)

**Interfaz:**
```typescript
interface LanceDBConfig {
  storagePath: string;  // e.g., './data/lancedb'
  autoCreate: boolean;   // Crear directorio automáticamente
}
```

**Componente:**
```typescript
'use client';

import { Database, Save, RefreshCw, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'bridge_lancedb_config';

export default function LanceDBConfig({ onConfigSaved }: { onConfigSaved?: () => void }) {
  const [config, setConfig] = useState<LanceDBConfig>({
    storagePath: './data/lancedb',
    autoCreate: true
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
    dbStats?: any;
  }>({ status: 'unknown' });

  // Test connection + stats
  const testConnection = async () => {
    // Llamar a /api/settings/test-lancedb
    // Mostrar estadísticas (total embeddings, namespaces, etc.)
  };

  // Save config
  const saveConfig = async () => {
    // Guardar en localStorage
    // Llamar a /api/settings/apply-lancedb
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>LanceDB</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Activo' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Base de datos vectorial para embeddings (almacenamiento local en archivos)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storage-path">Ruta de Almacenamiento</Label>
          <div className="flex gap-2">
            <Input
              id="storage-path"
              placeholder="./data/lancedb"
              value={config.storagePath}
              onChange={(e) => setConfig({ ...config, storagePath: e.target.value })}
            />
            <Button variant="outline" size="icon">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Directorio donde se guardarán los datos de LanceDB (.lancedb)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Crear directorio automáticamente</Label>
            <p className="text-xs text-muted-foreground">
              Crea el directorio si no existe
            </p>
          </div>
          <Switch
            checked={config.autoCreate}
            onCheckedChange={(checked) => setConfig({ ...config, autoCreate: checked })}
          />
        </div>

        {connectionStatus.dbStats && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Estadísticas:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total Embeddings:</span>
                <span className="ml-2 font-semibold">{connectionStatus.dbStats.totalEmbeddings}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Namespaces:</span>
                <span className="ml-2 font-semibold">{connectionStatus.dbStats.totalNamespaces}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={testConnection} disabled={testing} variant="outline" className="flex-1">
            {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
            Verificar Conexión
          </Button>
          <Button onClick={saveConfig} disabled={saving} className="flex-1">
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Configuración
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Ventajas de LanceDB:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Servidorless - Se ejecuta localmente sin servidor externo</li>
            <li>Alto rendimiento - Optimizado para búsquedas vectoriales</li>
            <li>Portabilidad - Datos en archivos locales</li>
            <li>Sin dependencias - No requiere PostgreSQL ni pgvector</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.2 Crear Rutas API

**`src/app/api/settings/test-lancedb/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { LanceDBWrapper } from '@/lib/lancedb-db';

export async function POST(request: NextRequest) {
  try {
    const { storagePath } = await request.json();

    // Inicializar LanceDB con la ruta
    const db = new LanceDBWrapper(storagePath);

    // Probar conexión + obtener estadísticas
    const connected = await db.checkConnection();
    const stats = await db.getStats();

    await db.close();

    return NextResponse.json({
      success: true,
      data: {
        connected,
        message: connected ? 'LanceDB funciona correctamente' : 'No se pudo conectar a LanceDB',
        dbStats: stats
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al probar LanceDB'
    }, { status: 500 });
  }
}
```

**`src/app/api/settings/apply-lancedb/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/client';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Aplicar configuración (recrear cliente con nueva ruta)
    const client = getEmbeddingClient();
    // Aquí podríamos tener un método updateConfig en LanceDBWrapper

    return NextResponse.json({
      success: true,
      message: 'Configuración de LanceDB aplicada correctamente'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al aplicar configuración'
    }, { status: 500 });
  }
}
```

---

## 🗂️ FASE 7: Eliminar PostgreSQL Config y Actualizar SettingsTab

### 7.1 Eliminar Archivos de PostgreSQL
```bash
rm /src/components/dashboard/settings/PostgresConfig.tsx
rm /src/app/api/settings/test-postgres/route.ts
rm /src/app/api/settings/apply-postgres/route.ts
```

### 7.2 Actualizar `src/components/dashboard/SettingsTab.tsx`

**Eliminaciones:**
```typescript
// Eliminar import
import PostgresConfig from './settings/PostgresConfig';

// Eliminar TabsTrigger
<TabsTrigger value="postgres">
  <Database className="h-4 w-4" />
  <span>PostgreSQL</span>
</TabsTrigger>

// Eliminar TabsContent
<TabsContent value="postgres" className="mt-6">
  <PostgresConfig key={`postgres-${refreshKey}`} onConfigSaved={handleRefresh} />
</TabsContent>
```

**Adiciones:**
```typescript
// Agregar import
import LanceDBConfig from './settings/LanceDBConfig';

// Agregar TabsTrigger
<TabsTrigger value="lancedb" className="flex items-center gap-2">
  <Database className="h-4 w-4" />
  <span>LanceDB</span>
</TabsTrigger>

// Agregar TabsContent
<TabsContent value="lancedb" className="mt-6">
  <LanceDBConfig key={`lancedb-${refreshKey}`} onConfigSaved={handleRefresh} />
</TabsContent>
```

### 7.3 Actualizar `ConnectionStatus` Componente
Modificar para verificar LanceDB en lugar de PostgreSQL

---

## ✅ FASE 8: Pruebas y Verificación

### 8.1 Pruebas Unitarias
- ✅ `LanceDBWrapper.insertEmbedding()` - Insertar embedding correctamente
- ✅ `LanceDBWrapper.searchSimilar()` - Buscar embeddings con similitud
- ✅ `LanceDBWrapper.upsertNamespace()` - Crear/actualizar namespace
- ✅ `LanceDBWrapper.deleteBySource()` - Eliminar embeddings por source
- ✅ `LanceDBWrapper.getStats()` - Obtener estadísticas

### 8.2 Pruebas de Integración
- ✅ Crear embedding desde UI de Embeddings
- ✅ Buscar embedding desde UI
- ✅ Crear namespace desde UI
- ✅ Listar namespaces desde API `/api/embeddings/namespaces`
- ✅ Eliminar namespace desde UI

### 8.3 Pruebas de Configuración
- ✅ Guardar configuración de LanceDB
- ✅ Probar conexión a LanceDB
- ✅ Guardar configuración de Ollama
- ✅ Probar conexión a Ollama
- ✅ Listar modelos de Ollama

### 8.4 Pruebas de Flujo Completo
1. Configurar Ollama (modelo, URL)
2. Configurar LanceDB (ruta de almacenamiento)
3. Crear un nuevo embedding manual
4. Verificar que se guarda en LanceDB
5. Buscar embedding
6. Crear un namespace
7. Agregar embedding al namespace
8. Eliminar embedding
9. Verificar estadísticas

---

## 📊 Resumen de Archivos Modificados

### Archivos a ELIMINAR (6 archivos)
```
/src/lib/embeddings/text-gen-client.ts
/src/components/dashboard/settings/PostgresConfig.tsx
/src/app/api/settings/test-postgres/route.ts
/src/app/api/settings/apply-postgres/route.ts
/src/app/api/settings/test-embeddings/route.ts  # (si existe para textgen)
/db/embeddings-schema.sql  # Ya no se usa
```

### Archivos a MODIFICAR (5 archivos)
```
/src/lib/embeddings/client.ts                # Eliminar soporte textgen, usar LanceDB
/src/lib/embeddings/types.ts                # Simplificar config
/src/components/dashboard/settings/EmbeddingsConfig.tsx  # Solo Ollama
/src/components/dashboard/settings/SettingsTab.tsx          # Reemplazar PostgreSQL por LanceDB
/src/app/api/embeddings/namespaces/route.ts                # Usar LanceDB
```

### Archivos a CREAR (3 archivos)
```
/src/lib/lancedb-db.ts                                    # Wrapper de LanceDB
/src/components/dashboard/settings/LanceDBConfig.tsx         # UI de configuración
/src/app/api/settings/test-lancedb/route.ts                # Prueba de conexión
```

---

## 🔄 Flujo de Ejecución Ordenado

### Paso 1: Instalación (5 min)
```bash
# 1.1 Instalar LanceDB
bun add @lancedb/lancedb

# 1.2 Crear directorio
mkdir -p data/lancedb
```

### Paso 2: Fase 2 - Eliminar TextGen (15 min)
1. Modificar `client.ts` - eliminar soporte textgen
2. Modificar `types.ts` - simplificar config
3. Modificar `EmbeddingsConfig.tsx` - eliminar UI de TextGen
4. Eliminar `text-gen-client.ts`
5. Eliminar rutas API de textgen

### Paso 3: Fase 3-4 - Implementar LanceDB (30 min)
1. Crear `lancedb-db.ts` con todos los métodos
2. Implementar schema de embeddings
3. Implementar schema de namespaces
4. Implementar búsqueda vectorial
5. Probar métodos básicos

### Paso 4: Fase 5 - Integrar LanceDB (10 min)
1. Modificar `client.ts` para usar LanceDB
2. Actualizar `checkConnections()`
3. Verificar que todas las rutas API funcionan

### Paso 5: Fase 6 - Crear UI de LanceDB (20 min)
1. Crear `LanceDBConfig.tsx`
2. Crear `/api/settings/test-lancedb/route.ts`
3. Crear `/api/settings/apply-lancedb/route.ts`
4. Probar UI

### Paso 6: Fase 7 - Eliminar PostgreSQL (10 min)
1. Eliminar `PostgresConfig.tsx`
2. Eliminar rutas API de PostgreSQL
3. Modificar `SettingsTab.tsx`
4. Actualizar `ConnectionStatus`

### Paso 7: Fase 8 - Pruebas (20 min)
1. Probar configuración de Ollama
2. Probar configuración de LanceDB
3. Crear embedding
4. Buscar embedding
5. Crear namespace
6. Verificar estadísticas

**Tiempo estimado total:** ~1.5 - 2 horas

---

## ⚠️ Consideraciones y Riesgos

### Riesgos
1. **Datos existentes en PostgreSQL:** Los embeddings almacenados actualmente no se migrarán automáticamente
   - **Mitigación:** Documentar cómo migrar datos manualmente (opcional)

2. **Compatibilidad de dimensiones:** Asegurar que el modelo de Ollama tenga las dimensiones correctas
   - **Mitigación:** Validar dimensiones al crear embeddings

3. **Permisos de archivos:** LanceDB necesita permisos de escritura en el directorio
   - **Mitigación:** Verificar permisos y crear directorio automáticamente

### Consideraciones
1. **Backwards compatibility:** Mantener `embeddings-db.ts` por si se quiere usar PostgreSQL en el futuro
2. **Testing exhaustivo:** Probar todas las rutas API que usan embeddings
3. **Documentación:** Actualizar README con nueva configuración

---

## 🎯 Criterios de Éxito

### Funcionales
- ✅ Solo Ollama como proveedor de embeddings
- ✅ LanceDB como base de datos por defecto
- ✅ Crear, buscar, eliminar embeddings funcionan correctamente
- ✅ Crear, listar, eliminar namespaces funcionan correctamente
- ✅ Configuración de Ollama funciona
- ✅ Configuración de LanceDB funciona

### Técnicos
- ✅ Sin errores de TypeScript
- ✅ Sin dependencias rotas
- ✅ Todas las rutas API funcionan
- ✅ No hay código muerto de TextGen o PostgreSQL

### UX
- ✅ Interfaz simplificada (menos opciones de configuración)
- ✅ Feedback claro de conexión (Ollama y LanceDB)
- ✅ Estadísticas visibles (total embeddings, namespaces)

---

## 📝 Notas Adicionales

### Ollama Models Recomendados
- `nomic-embed-text` (768 dims) - Buen balance calidad/velocidad
- `mxbai-embed-large` (1024 dims) - Mejor calidad, más lento
- `all-minilm` (384 dims) - Muy rápido, menos calidad

### Configuración Recomendada de LanceDB
```
Storage Path: ./data/lancedb
Auto Create: true
```

### Rutas de API a Verificar después de la migración
```
POST   /api/embeddings/create
POST   /api/embeddings/batch
POST   /api/embeddings/search
GET    /api/embeddings/namespaces
POST   /api/embeddings/namespaces
DELETE /api/embeddings/namespaces/[namespace]
GET    /api/embeddings/stats
DELETE /api/embeddings/[id]
DELETE /api/embeddings/delete-by-source
POST   /api/embeddings/trigger
GET    /api/embeddings/connections
```

---

**Estado del Plan:** ✅ Listo para Implementación

**Siguiente Paso:** Iniciar con FASE 2 - Eliminar Text Generation WebUI

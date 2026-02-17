'use client';

import { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, Trash2, AlertTriangle, CheckCircle, Info, Cpu, Database,
  Download, Upload, TestTube, FolderOpen, Monitor, Settings2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

// ============================================
// TIPOS
// ============================================

interface OllamaModel {
  name: string;
  size: number;
  sizeFormatted: string;
  isEmbeddingModel: boolean;
  knownDimension: number | null;
  category: 'embedding' | 'chat';
}

interface EmbeddingConfig {
  ollamaUrl: string;
  model: string;
  dimension: number;
  similarityThreshold: number; // 0.0 - 1.0
  maxResults: number; // 1 - 100
}

interface LanceDBConfig {
  storagePath: string;
  autoCreate: boolean;
}

interface SystemInfo {
  platform: string;
  isWindows: boolean;
  isLinux: boolean;
  isMacOS: boolean;
  currentUri: string | null;
  isInitialized: boolean;
  lancedbAvailable?: boolean;
  lancedbError?: string;
}

interface DBStats {
  totalEmbeddings: number;
  totalNamespaces: number;
  embeddingsByNamespace: Record<string, number>;
}

// ============================================
// CONSTANTES
// ============================================

const OLLAMA_STORAGE_KEY = 'bridge_embeddings_config';
const LANCEDB_STORAGE_KEY = 'bridge_lancedb_config';

const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'bge-m3:567m',
  dimension: 1024,
  similarityThreshold: 0.5,
  maxResults: 5
};

const DEFAULT_LANCEDB_CONFIG: LanceDBConfig = {
  storagePath: './data/lancedb',
  autoCreate: true
};

// Dimensiones conocidas para modelos populares
const MODEL_DIMENSIONS: Record<string, number> = {
  'nomic-embed-text': 768,
  'nomic-embed-text:latest': 768,
  'bge-m3': 1024,
  'bge-m3:latest': 1024,
  'bge-m3:567m': 1024,
  'mxbai-embed-large': 1024,
  'mxbai-embed-large:latest': 1024,
  'all-minilm': 384,
  'all-minilm:latest': 384,
  'snowflake-arctic-embed': 1024,
  'snowflake-arctic-embed:latest': 1024,
  'jina-embeddings-v2': 768,
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface EmbeddingsSettingsProps {
  onConfigSaved?: () => void;
}

export default function EmbeddingsSettings({ onConfigSaved }: EmbeddingsSettingsProps) {
  // Estado de Ollama
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>(DEFAULT_EMBEDDING_CONFIG);
  const [allModels, setAllModels] = useState<OllamaModel[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<OllamaModel[]>([]);
  const [chatModels, setChatModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [savingOllama, setSavingOllama] = useState(false);

  // Estado de LanceDB
  const [lancedbConfig, setLancedbConfig] = useState<LanceDBConfig>(DEFAULT_LANCEDB_CONFIG);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [lancedbConnected, setLancedbConnected] = useState<boolean | null>(null);
  const [savingLanceDB, setSavingLanceDB] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Estado de reset
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadConfigs();
    loadOllamaModels();
    loadLanceDBInfo();
  }, []);

  // Actualizar dimensión cuando cambia el modelo
  useEffect(() => {
    const knownDimension = MODEL_DIMENSIONS[embeddingConfig.model];
    if (knownDimension) {
      setEmbeddingConfig(prev => ({ ...prev, dimension: knownDimension }));
    }
  }, [embeddingConfig.model]);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadConfigs = async () => {
    // Primero intentar cargar desde el servidor (configuración persistente)
    try {
      const response = await fetch('/api/settings/embeddings-global');
      const data = await response.json();

      if (data.success && data.data) {
        const serverConfig = {
          ollamaUrl: data.data.ollamaUrl,
          model: data.data.embeddingModel,
          dimension: data.data.embeddingDimension,
          similarityThreshold: data.data.similarityThreshold,
          maxResults: data.data.maxResults
        };
        setEmbeddingConfig(prev => ({ ...prev, ...serverConfig }));
        // También guardar en localStorage para referencia local
        localStorage.setItem(OLLAMA_STORAGE_KEY, JSON.stringify(serverConfig));
        console.log('✅ Configuración cargada desde servidor:', serverConfig);
      }
    } catch (e) {
      console.error('Error loading server config:', e);
      // Fallback a localStorage si el servidor no está disponible
      const savedOllama = localStorage.getItem(OLLAMA_STORAGE_KEY);
      if (savedOllama) {
        try {
          const parsed = JSON.parse(savedOllama);
          setEmbeddingConfig(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Error loading Ollama config from localStorage:', e);
        }
      }
    }

    // Cargar config de LanceDB desde localStorage
    const savedLanceDB = localStorage.getItem(LANCEDB_STORAGE_KEY);
    if (savedLanceDB) {
      try {
        const parsed = JSON.parse(savedLanceDB);
        setLancedbConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading LanceDB config:', e);
      }
    }
  };

  const loadOllamaModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/settings/ollama-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaUrl: embeddingConfig.ollamaUrl })
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setOllamaConnected(true);
        const all = data.data.allModels || [];
        const embeddings = data.data.embeddingModels || [];
        const chat = data.data.chatModels || [];
        
        setAllModels(all);
        setEmbeddingModels(embeddings);
        setChatModels(chat);
      } else {
        setOllamaConnected(false);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setOllamaConnected(false);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadLanceDBInfo = async () => {
    try {
      const response = await fetch('/api/settings/test-lancedb');
      const data = await response.json();
      
      if (data.success) {
        setLancedbConnected(data.data.connected);
        if (data.data.systemInfo) {
          setSystemInfo(data.data.systemInfo);
        }
        if (data.data.dbStats) {
          setDbStats(data.data.dbStats);
        }
      }
    } catch (error) {
      console.error('Error loading LanceDB info:', error);
      setLancedbConnected(false);
    }
  };

  // ============================================
  // GUARDAR CONFIGURACIÓN
  // ============================================

  const saveOllamaConfig = async () => {
    setSavingOllama(true);
    try {
      localStorage.setItem(OLLAMA_STORAGE_KEY, JSON.stringify(embeddingConfig));

      const response = await fetch('/api/settings/embeddings-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ollamaUrl: embeddingConfig.ollamaUrl,
          embeddingModel: embeddingConfig.model,
          embeddingDimension: embeddingConfig.dimension,
          similarityThreshold: embeddingConfig.similarityThreshold,
          maxResults: embeddingConfig.maxResults
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Configuración Guardada',
          description: `${embeddingConfig.model} (${embeddingConfig.dimension}D) - Threshold: ${(embeddingConfig.similarityThreshold * 100).toFixed(0)}%`
        });

        if (onConfigSaved) onConfigSaved();
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingOllama(false);
    }
  };

  const saveLanceDBConfig = async () => {
    setSavingLanceDB(true);
    try {
      localStorage.setItem(LANCEDB_STORAGE_KEY, JSON.stringify(lancedbConfig));

      const response = await fetch('/api/settings/apply-lancedb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancedbConfig)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ LanceDB Guardado',
          description: 'Configuración aplicada correctamente'
        });
        
        loadLanceDBInfo();
        if (onConfigSaved) onConfigSaved();
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingLanceDB(false);
    }
  };

  // ============================================
  // RESET Y BACKUP
  // ============================================

  const handleReset = async () => {
    setResetting(true);
    try {
      const response = await fetch('/api/embeddings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Base de Datos Reiniciada',
          description: `Dimensión: ${embeddingConfig.dimension}D`
        });
        setResetDialogOpen(false);
        loadLanceDBInfo();
        if (onConfigSaved) onConfigSaved();
      } else {
        throw new Error(data.error || 'Error al reiniciar');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setResetting(false);
    }
  };

  const exportBackup = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/settings/lancedb/backup', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lancedb_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: '✅ Backup Exportado',
          description: `${data.data.backup.metadata.totalEmbeddings} embeddings`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const backup = JSON.parse(content);

      const response = await fetch('/api/settings/lancedb/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, merge: true })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Backup Importado',
          description: `${data.data.imported} embeddings`
        });
        loadLanceDBInfo();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const getPlatformName = () => {
    if (!systemInfo) return 'Desconocido';
    if (systemInfo.isWindows) return 'Windows';
    if (systemInfo.isLinux) return 'Linux';
    if (systemInfo.isMacOS) return 'macOS';
    return systemInfo.platform;
  };

  const renderModelItem = (model: OllamaModel) => (
    <SelectItem key={model.name} value={model.name}>
      <div className="flex items-center gap-2">
        <span>{model.name}</span>
        {model.knownDimension && (
          <Badge variant="outline" className="text-xs">{model.knownDimension}D</Badge>
        )}
      </div>
    </SelectItem>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Estado General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* LanceDB Status */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">LanceDB</div>
                <Badge variant={lancedbConnected ? 'default' : 'destructive'}>
                  {lancedbConnected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
            </div>

            {/* Ollama Status */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Cpu className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Ollama</div>
                <Badge variant={ollamaConnected ? 'default' : 'destructive'}>
                  {ollamaConnected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
            </div>

            {/* Total Embeddings */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Info className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Embeddings</div>
                <div className="text-xl font-bold">{dbStats?.totalEmbeddings || 0}</div>
              </div>
            </div>

            {/* Plataforma */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Monitor className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Plataforma</div>
                <div className="text-sm">{getPlatformName()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="model" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="model">Modelo de Embeddings</TabsTrigger>
          <TabsTrigger value="database">Base de Datos</TabsTrigger>
        </TabsList>

        {/* TAB: Modelo de Embeddings */}
        <TabsContent value="model" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Configuración de Ollama
              </CardTitle>
              <CardDescription>
                Configura el modelo para generar embeddings y búsquedas vectoriales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL de Ollama */}
              <div className="space-y-2">
                <Label>URL de Ollama</Label>
                <div className="flex gap-2">
                  <Input
                    value={embeddingConfig.ollamaUrl}
                    onChange={(e) => setEmbeddingConfig(prev => ({ ...prev, ollamaUrl: e.target.value }))}
                    placeholder="http://localhost:11434"
                  />
                  <Button variant="outline" size="icon" onClick={loadOllamaModels} disabled={isLoadingModels}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Selector de Modelo */}
              <div className="space-y-2">
                <Label>Modelo de Embeddings</Label>
                <Select
                  value={embeddingConfig.model}
                  onValueChange={(value) => setEmbeddingConfig(prev => ({ ...prev, model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {embeddingModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Modelos de Embeddings ({embeddingModels.length})</SelectLabel>
                        {embeddingModels.map(renderModelItem)}
                      </SelectGroup>
                    )}
                    {embeddingModels.length > 0 && chatModels.length > 0 && <SelectSeparator />}
                    {chatModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Otros Modelos ({chatModels.length})</SelectLabel>
                        {chatModels.map(renderModelItem)}
                      </SelectGroup>
                    )}
                    {allModels.length === 0 && (
                      <SelectItem value={embeddingConfig.model}>{embeddingConfig.model}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimensión */}
              <div className="space-y-2">
                <Label>Dimensión del Vector</Label>
                <Input
                  type="number"
                  value={embeddingConfig.dimension}
                  onChange={(e) => setEmbeddingConfig(prev => ({ ...prev, dimension: parseInt(e.target.value) || 768 }))}
                />
                <p className="text-xs text-muted-foreground">
                  {MODEL_DIMENSIONS[embeddingConfig.model] 
                    ? `Dimensión conocida para ${embeddingConfig.model}: ${MODEL_DIMENSIONS[embeddingConfig.model]}D`
                    : 'Especifica la dimensión del modelo'}
                </p>
              </div>

              <Separator />

              {/* Configuración de Búsqueda */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <Label className="text-base font-semibold">Configuración de Búsqueda</Label>
                </div>
                
                {/* Threshold de Similitud */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Umbral de Similitud</Label>
                    <Badge variant="outline">{(embeddingConfig.similarityThreshold * 100).toFixed(0)}%</Badge>
                  </div>
                  <Slider
                    value={[embeddingConfig.similarityThreshold]}
                    onValueChange={(v) => setEmbeddingConfig(prev => ({ ...prev, similarityThreshold: v[0] }))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de similitud para incluir resultados. Menor = más resultados, Mayor = más precisos
                  </p>
                </div>

                {/* Máximo de Resultados */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Máximo de Resultados</Label>
                    <Badge variant="outline">{embeddingConfig.maxResults}</Badge>
                  </div>
                  <Slider
                    value={[embeddingConfig.maxResults]}
                    onValueChange={(v) => setEmbeddingConfig(prev => ({ ...prev, maxResults: v[0] }))}
                    min={1}
                    max={20}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de documentos a devolver en cada búsqueda
                  </p>
                </div>
              </div>

              <Button onClick={saveOllamaConfig} disabled={savingOllama} className="w-full">
                {savingOllama ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración de Modelo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Modelo recomendado:</strong> bge-m3:567m (1024 dimensiones)
              <br />
              El mismo modelo debe usarse para crear embeddings y para buscar.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* TAB: Base de Datos */}
        <TabsContent value="database" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuración de LanceDB
              </CardTitle>
              <CardDescription>
                Base de datos vectorial local para almacenar embeddings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ruta de almacenamiento */}
              <div className="space-y-2">
                <Label>Ruta de Almacenamiento</Label>
                <div className="flex gap-2">
                  <Input
                    value={lancedbConfig.storagePath}
                    onChange={(e) => setLancedbConfig(prev => ({ ...prev, storagePath: e.target.value }))}
                    placeholder="./data/lancedb"
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => setLancedbConfig(prev => ({ ...prev, storagePath: './data/lancedb' }))}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Auto-crear */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm">Crear directorio automáticamente</Label>
                  <p className="text-xs text-muted-foreground">Crea el directorio si no existe</p>
                </div>
                <Button
                  variant={lancedbConfig.autoCreate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLancedbConfig(prev => ({ ...prev, autoCreate: !prev.autoCreate }))}
                >
                  {lancedbConfig.autoCreate ? 'Activado' : 'Desactivado'}
                </Button>
              </div>

              <Separator />

              {/* Backup */}
              <div className="space-y-2">
                <Label>Backup y Migración</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportBackup} disabled={exporting || !lancedbConnected} className="flex-1">
                    {exporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Exportar
                  </Button>
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importBackup}
                      disabled={importing}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" size="sm" disabled={importing} className="w-full">
                      {importing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Importar
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={saveLanceDBConfig} disabled={savingLanceDB} className="w-full">
                {savingLanceDB ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración de LanceDB
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Reiniciar Base de Datos */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Reiniciar Base de Datos
              </CardTitle>
              <CardDescription>
                Elimina todos los embeddings. Útil si cambias la dimensión del modelo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta acción eliminará TODOS los embeddings. La BD se recreará con dimensión {embeddingConfig.dimension}D.
                </AlertDescription>
              </Alert>

              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reiniciar Base de Datos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>¿Estás seguro?</DialogTitle>
                    <DialogDescription>
                      Se eliminarán todos los embeddings. La BD se recreará con {embeddingConfig.dimension}D para {embeddingConfig.model}.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleReset} disabled={resetting}>
                      {resetting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Sí, Reiniciar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

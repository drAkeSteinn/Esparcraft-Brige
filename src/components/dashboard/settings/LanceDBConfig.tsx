'use client';

import { useState, useEffect } from 'react';
import { 
  Database, Save, TestTube, RefreshCw, FolderOpen, HardDrive, 
  Download, Upload, Info, AlertTriangle, CheckCircle, Monitor
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

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
  embeddingsBySourceType: Record<string, number>;
}

interface LanceDBConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_lancedb_config';

export default function LanceDBConfig({ onConfigSaved }: LanceDBConfigProps) {
  const [config, setConfig] = useState<LanceDBConfig>({
    storagePath: './data/lancedb',
    autoCreate: true
  });
  
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
    error?: string;
    suggestion?: string;
  }>({ status: 'unknown' });
  
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dbStats, setDBStats] = useState<DBStats | null>(null);

  // Cargar configuración guardada
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    // Cargar información del sistema
    loadSystemInfo();
    testConnection(false);
  }, []);

  const loadSystemInfo = async () => {
    try {
      const response = await fetch('/api/settings/test-lancedb');
      const data = await response.json();
      
      if (data.success && data.data.systemInfo) {
        setSystemInfo(data.data.systemInfo);
        // Si LanceDB no está disponible, actualizar el estado de conexión
        if (data.data.systemInfo.lancedbAvailable === false) {
          setConnectionStatus({
            status: 'disconnected',
            message: 'LanceDB no está disponible en este sistema',
            error: data.data.systemInfo.lancedbError,
            suggestion: 'Verifica que tu sistema sea compatible (Linux x64 glibc, macOS ARM/x64, Windows x64).'
          });
        }
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/settings/test-lancedb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: config.storagePath })
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ 
          status: 'connected', 
          message: data.data.message
        });
        
        if (data.data.dbStats) {
          setDBStats(data.data.dbStats);
        }
        
        if (data.data.systemInfo) {
          setSystemInfo(data.data.systemInfo);
        }
        
        if (showToastMsg) {
          toast({
            title: '✅ Conexión Exitosa',
            description: 'LanceDB funciona correctamente'
          });
        }
      } else {
        setConnectionStatus({ 
          status: 'disconnected', 
          message: data.data?.message || 'No se pudo conectar',
          error: data.data?.error,
          suggestion: data.data?.suggestion
        });
        
        if (showToastMsg) {
          toast({
            title: '❌ Error de Conexión',
            description: data.data?.message || 'No se pudo conectar',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      setConnectionStatus({ 
        status: 'disconnected', 
        message: error.message,
        error: error.message
      });
      
      if (showToastMsg) {
        toast({
          title: 'Error',
          description: 'No se pudo verificar la conexión',
          variant: 'destructive'
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);

    try {
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración en el servidor
      const response = await fetch('/api/settings/apply-lancedb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Configuración Guardada',
          description: 'La configuración de LanceDB se ha guardado correctamente'
        });

        if (onConfigSaved) {
          onConfigSaved();
        }
        
        // Recargar información
        await testConnection(false);
      } else {
        throw new Error(data.error || 'Error al aplicar configuración');
      }
    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la configuración',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConfig: LanceDBConfig = {
      storagePath: './data/lancedb',
      autoCreate: true
    };

    setConfig(defaultConfig);
    setConnectionStatus({ status: 'unknown' });
    toast({
      title: 'Configuración Restablecida',
      description: 'Se han restablecido los valores por defecto'
    });
  };

  const exportBackup = async () => {
    setExporting(true);
    
    try {
      const response = await fetch('/api/settings/lancedb/backup', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Descargar archivo
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
          description: `Exportados ${data.data.backup.metadata.totalEmbeddings} embeddings`
        });
      } else {
        throw new Error(data.error || 'Error al exportar');
      }
    } catch (error: any) {
      toast({
        title: 'Error al Exportar',
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
      
      // Validar estructura
      if (!backup.version || !backup.embeddings) {
        throw new Error('Formato de backup inválido');
      }
      
      const response = await fetch('/api/settings/lancedb/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, merge: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Backup Importado',
          description: `Importados ${data.data.imported} embeddings`
        });
        
        // Recargar estadísticas
        await testConnection(false);
      } else {
        throw new Error(data.error || 'Error al importar');
      }
    } catch (error: any) {
      toast({
        title: 'Error al Importar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      // Limpiar input
      event.target.value = '';
    }
  };

  const getPlatformIcon = () => {
    if (!systemInfo) return <Monitor className="h-4 w-4" />;
    if (systemInfo.isWindows) return <span className="text-sm">🪟</span>;
    if (systemInfo.isLinux) return <span className="text-sm">🐧</span>;
    if (systemInfo.isMacOS) return <span className="text-sm">🍎</span>;
    return <Monitor className="h-4 w-4" />;
  };

  const getPlatformName = () => {
    if (!systemInfo) return 'Desconocido';
    if (systemInfo.isWindows) return 'Windows';
    if (systemInfo.isLinux) return 'Linux';
    if (systemInfo.isMacOS) return 'macOS';
    return systemInfo.platform;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>LanceDB Vector Store</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getPlatformIcon()}
              <span>{getPlatformName()}</span>
            </Badge>
            <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
              {connectionStatus.status === 'connected' ? 'Activo' : connectionStatus.status === 'disconnected' ? 'Error' : 'Sin verificar'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Base de datos vectorial local para embeddings con soporte multiplataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta de LanceDB no disponible */}
        {systemInfo && systemInfo.lancedbAvailable === false && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>LanceDB No Disponible</AlertTitle>
            <AlertDescription>
              <p>El módulo nativo de LanceDB no pudo cargarse en este sistema.</p>
              <p className="mt-2 text-xs opacity-80">
                <strong>Error:</strong> {systemInfo.lancedbError || 'Error desconocido'}
              </p>
              <p className="mt-1 text-xs opacity-80">
                <strong>Sistemas compatibles:</strong> Linux x64 (glibc), macOS (ARM/x64), Windows x64
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Información del Sistema */}
        {systemInfo && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Información del Sistema</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Plataforma:</span>
                <span className="ml-2 font-medium">{getPlatformName()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inicializado:</span>
                <span className="ml-2 font-medium">{systemInfo.isInitialized ? '✓' : '✗'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">LanceDB:</span>
                <span className={`ml-2 font-medium ${systemInfo.lancedbAvailable !== false ? 'text-green-600' : 'text-red-600'}`}>
                  {systemInfo.lancedbAvailable !== false ? '✓ Disponible' : '✗ No disponible'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">URI:</span>
                <span className="ml-2 font-mono text-xs">{systemInfo.currentUri || 'No configurado'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Configuración de Ruta */}
        <div className="space-y-2">
          <Label htmlFor="storage-path">Ruta de Almacenamiento</Label>
          <div className="flex gap-2">
            <Input
              id="storage-path"
              placeholder="./data/lancedb"
              value={config.storagePath}
              onChange={(e) => setConfig({ ...config, storagePath: e.target.value })}
              className="flex-1 font-mono text-sm"
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setConfig({ ...config, storagePath: './data/lancedb' })}
              title="Restaurar ruta por defecto"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {systemInfo?.isWindows 
              ? 'Usar rutas absolutas o relativas (ej: C:\\data\\lancedb o .\\data\\lancedb)'
              : 'Usar rutas absolutas o relativas (ej: /var/data/lancedb o ./data/lancedb)'}
          </p>
        </div>

        {/* Auto-crear directorio */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm">Crear directorio automáticamente</Label>
            <p className="text-xs text-muted-foreground">
              Crea el directorio y subdirectorios si no existen
            </p>
          </div>
          <Button
            variant={config.autoCreate ? 'default' : 'outline'}
            size="sm"
            onClick={() => setConfig({ ...config, autoCreate: !config.autoCreate })}
          >
            {config.autoCreate ? 'Activado' : 'Desactivado'}
          </Button>
        </div>

        {/* Estadísticas */}
        {dbStats && (
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Estadísticas de LanceDB
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 bg-background rounded">
                <div className="text-2xl font-bold text-primary">{dbStats.totalEmbeddings}</div>
                <div className="text-xs text-muted-foreground">Embeddings</div>
              </div>
              <div className="text-center p-2 bg-background rounded">
                <div className="text-2xl font-bold text-primary">{dbStats.totalNamespaces}</div>
                <div className="text-xs text-muted-foreground">Namespaces</div>
              </div>
            </div>
            
            {Object.keys(dbStats.embeddingsByNamespace || {}).length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-2">Por Namespace:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(dbStats.embeddingsByNamespace || {}).map(([ns, count]) => (
                    <Badge key={ns} variant="outline" className="text-xs">
                      {ns}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error con sugerencia */}
        {connectionStatus.status === 'disconnected' && connectionStatus.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription>
              <p>{connectionStatus.message}</p>
              {connectionStatus.suggestion && (
                <p className="mt-2 text-sm opacity-80">
                  <strong>Sugerencia:</strong> {connectionStatus.suggestion}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Mensaje de éxito */}
        {connectionStatus.status === 'connected' && connectionStatus.message && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Conectado</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              {connectionStatus.message}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Backup y Migración */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Backup y Migración</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportBackup}
              disabled={exporting || connectionStatus.status !== 'connected'}
              className="flex-1"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Backup
            </Button>
            
            <div className="relative flex-1">
              <input
                type="file"
                accept=".json"
                onChange={importBackup}
                disabled={importing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar Backup
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Exporta todos los embeddings a JSON para backup o migración entre sistemas
          </p>
        </div>

        <Separator />

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={() => testConnection(true)}
            disabled={testing}
            variant="outline"
            className="flex-1"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Verificar
              </>
            )}
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="icon"
            title="Restablecer"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Información adicional */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Ventajas de LanceDB:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Serverless</strong> - Se ejecuta localmente sin servidor externo</li>
            <li><strong>Multiplataforma</strong> - Funciona en Windows, Linux y macOS</li>
            <li><strong>Alto rendimiento</strong> - Optimizado para búsquedas vectoriales</li>
            <li><strong>Portabilidad</strong> - Datos en archivos locales (fácil backup)</li>
            <li><strong>Sin dependencias externas</strong> - No requiere PostgreSQL</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

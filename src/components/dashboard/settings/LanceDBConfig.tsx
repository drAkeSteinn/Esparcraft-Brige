'use client';

import { useState, useEffect } from 'react';
import { Database, Save, TestTube, RefreshCw, FolderOpen, HardDrive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface LanceDBConfig {
  storagePath: string;
  autoCreate: boolean;
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
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
    dbStats?: any;
  }>({ status: 'unknown' });

  // Cargar configuración guardada
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    testConnection(false);
  }, []);

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
          message: data.data.message,
          dbStats: data.data.dbStats
        });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: 'LanceDB funciona correctamente'
          });
        }
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      setConnectionStatus({ status: 'disconnected', message: error.message });
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
          title: 'Configuración Guardada',
          description: 'La configuración de LanceDB se ha guardado correctamente'
        });

        if (onConfigSaved) {
          onConfigSaved();
        }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>LanceDB</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Activo' : connectionStatus.status === 'disconnected' ? 'Error' : 'Sin verificar'}
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
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => setConfig({ ...config, storagePath: './data/lancedb' })}>
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setConfig({ ...config, autoCreate: !config.autoCreate })}
          >
            <HardDrive className={`h-4 w-4 ${config.autoCreate ? 'text-green-600' : 'text-muted-foreground'}`} />
          </Button>
        </div>

        {connectionStatus.dbStats && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Estadísticas de LanceDB:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total Embeddings:</span>
                <span className="ml-2 font-semibold">{connectionStatus.dbStats.totalEmbeddings || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Namespaces:</span>
                <span className="ml-2 font-semibold">{connectionStatus.dbStats.totalNamespaces || 0}</span>
              </div>
            </div>
            {Object.keys(connectionStatus.dbStats.embeddingsByNamespace || {}).length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="font-medium mb-1">Embeddings por Namespace:</p>
                <div className="space-y-1">
                  {Object.entries(connectionStatus.dbStats.embeddingsByNamespace || {}).map(([ns, count]) => (
                    <div key={ns} className="flex justify-between">
                      <span className="text-muted-foreground">{ns}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {connectionStatus.message && (
          <div className={`p-3 rounded-lg ${
            connectionStatus.status === 'connected'
              ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
          }`}>
            <p className="text-sm">{connectionStatus.message}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={testConnection}
            disabled={testing}
            variant="outline"
            className="flex-1"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Verificar Conexión
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
                Guardar Configuración
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="ghost"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Ventajas de LanceDB:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Servidorless</strong> - Se ejecuta localmente sin servidor externo</li>
            <li><strong>Alto rendimiento</strong> - Optimizado para búsquedas vectoriales</li>
            <li><strong>Portabilidad</strong> - Datos en archivos locales (fácil backup)</li>
            <li><strong>Sin dependencias</strong> - No requiere PostgreSQL ni pgvector</li>
            <li><strong>Fácil configuración</strong> - Solo especifica ruta de almacenamiento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

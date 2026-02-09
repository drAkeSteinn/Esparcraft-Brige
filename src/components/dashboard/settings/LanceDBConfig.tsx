'use client';

import { useState, useEffect } from 'react';
import { Database, Save, RefreshCw, Info, FolderOpen, HardDrive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface LanceDBConfig {
  dbPath: string;
}

interface LanceDBConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_lancedb_config';

export default function LanceDBConfig({ onConfigSaved }: LanceDBConfigProps) {
  const [config, setConfig] = useState<LanceDBConfig>({
    dbPath: './data/embeddings'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });
  const [stats, setStats] = useState<{
    total_embeddings?: number;
    total_namespaces?: number;
    unique_sources?: number;
  }>({});

  useEffect(() => {
    // Cargar configuración guardada
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    // Verificar conexión inicial
    testConnection(false);
    loadStats();
  }, []);

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/embeddings/connections', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ 
          status: 'connected', 
          message: 'LanceDB está funcionando correctamente' 
        });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: 'LanceDB está conectado y funcionando correctamente'
          });
        }
      } else {
        setConnectionStatus({ 
          status: 'disconnected', 
          message: data.data?.message || 'No se pudo conectar a LanceDB' 
        });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar a LanceDB',
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      setConnectionStatus({ 
        status: 'disconnected', 
        message: error.message || 'Error al verificar la conexión' 
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

  const loadStats = async () => {
    try {
      const response = await fetch('/api/embeddings/connections/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);

    try {
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      toast({
        title: 'Configuración Guardada',
        description: 'La configuración de LanceDB se ha guardado correctamente'
      });

      // Recargar stats
      await loadStats();

      if (onConfigSaved) {
        onConfigSaved();
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
      dbPath: './data/embeddings'
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
            <HardDrive className="h-5 w-5" />
            <span>LanceDB</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Base de datos vectorial para almacenamiento de embeddings (local, sin configuración externa)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lancedb-path">Ruta de la Base de Datos</Label>
          <div className="flex gap-2">
            <Input
              id="lancedb-path"
              placeholder="./data/embeddings"
              value={config.dbPath}
              onChange={(e) => setConfig({ ...config, dbPath: e.target.value })}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              title="La ruta es relativa al directorio del proyecto"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ruta donde se almacenan los embeddings vectoriales. Por defecto: ./data/embeddings
          </p>
        </div>

        {/* Estadísticas */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Estadísticas de la Base de Datos
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {stats.total_embeddings || 0}
              </p>
              <p className="text-xs text-muted-foreground">Embeddings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {stats.total_namespaces || 0}
              </p>
              <p className="text-xs text-muted-foreground">Namespaces</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {stats.unique_sources || 0}
              </p>
              <p className="text-xs text-muted-foreground">Fuentes Únicas</p>
            </div>
          </div>
        </div>

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
            onClick={() => {
              testConnection(false);
              loadStats();
            }}
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
                <RefreshCw className="h-4 w-4 mr-2" />
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
            <Info className="h-4 w-4" />
            Información de LanceDB
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>LanceDB es una base de datos vectorial local que funciona directamente en Node.js</li>
            <li>No requiere servicios externos ni configuración de servidor</li>
            <li>Los embeddings se almacenan en archivos locales en la ruta especificada</li>
            <li>Soporta búsqueda vectorial eficiente con índices HNSW</li>
            <li>Automatiza la persistencia y no necesita conexión manual</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

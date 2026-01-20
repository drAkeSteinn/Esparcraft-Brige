'use client';

import { useState, useEffect } from 'react';
import { Database, Save, TestTube, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface PostgresConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

interface PostgresConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_postgres_config';

export default function PostgresConfig({ onConfigSaved }: PostgresConfigProps) {
  const [config, setConfig] = useState<PostgresConfig>({
    host: 'localhost',
    port: '5432',
    database: 'bridge_embeddings',
    user: 'postgres',
    password: ''
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
  }>({ status: 'unknown' });

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
  }, []);

  const testConnection = async (showToastMsg: boolean = true) => {
    setTesting(true);
    setConnectionStatus({ status: 'unknown' });

    try {
      const response = await fetch('/api/settings/test-postgres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ status: 'connected', message: data.data.message });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: 'La conexión a PostgreSQL funciona correctamente'
          });
        }
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar a PostgreSQL',
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
      const response = await fetch('/api/settings/apply-postgres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Configuración Guardada',
          description: 'La configuración de PostgreSQL se ha guardado y aplicado correctamente'
        });

        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        throw new Error(data.error || 'Error al aplicar configuración en el servidor');
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
    const defaultConfig: PostgresConfig = {
      host: 'localhost',
      port: '5432',
      database: 'bridge_embeddings',
      user: 'postgres',
      password: ''
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
            <span>PostgreSQL</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura la conexión a la base de datos PostgreSQL para embeddings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postgres-host">Host / IP</Label>
            <Input
              id="postgres-host"
              placeholder="localhost"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postgres-port">Puerto</Label>
            <Input
              id="postgres-port"
              type="number"
              placeholder="5432"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postgres-database">Nombre de Base de Datos</Label>
          <Input
            id="postgres-database"
            placeholder="bridge_embeddings"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postgres-user">Usuario</Label>
          <Input
            id="postgres-user"
            placeholder="postgres"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postgres-password">Contraseña</Label>
          <div className="relative">
            <Input
              id="postgres-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="•••••••••"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
                Probar Conexión
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
          <p className="text-sm font-medium">Instrucciones:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Asegúrate de que PostgreSQL tenga instalada la extensión pgvector</li>
            <li>El usuario debe tener permisos para crear tablas</li>
            <li>Ejecuta el script <code className="bg-background px-1 py-0.5 rounded">db/embeddings-schema.sql</code> para crear las tablas</li>
            <li>Usa "localhost" si la base de datos está en la misma máquina</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

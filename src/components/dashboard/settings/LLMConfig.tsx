'use client';

import { useState, useEffect } from 'react';
import { Server, Save, TestTube, RefreshCw, Gauge } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';

interface LLMConfig {
  apiUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
}

interface LLMConfigProps {
  onConfigSaved?: () => void;
}

const STORAGE_KEY = 'bridge_llm_config';

const PREDEFINED_MODELS = [
  'local-model',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'text-davinci-003',
];

export default function LLMConfig({ onConfigSaved }: LLMConfigProps) {
  const [config, setConfig] = useState<LLMConfig>({
    apiUrl: 'http://127.0.0.1:5000/v1/chat/completions',
    model: 'local-model',
    temperature: '0.7',
    maxTokens: '2000'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'unknown' | 'connected' | 'disconnected';
    message?: string;
    latency?: number;
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

    const startTime = Date.now();

    try {
      const response = await fetch('/api/settings/test-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const latency = Date.now() - startTime;
      const data = await response.json();

      if (data.success && data.data.connected) {
        setConnectionStatus({ 
          status: 'connected', 
          message: data.data.message,
          latency
        });
        if (showToastMsg) {
          toast({
            title: 'Conexión Exitosa',
            description: `La conexión a LLM funciona correctamente (${latency}ms)`
          });
        }
      } else {
        setConnectionStatus({ status: 'disconnected', message: data.data?.message || 'No se pudo conectar' });
        if (showToastMsg) {
          toast({
            title: 'Error de Conexión',
            description: data.data?.message || 'No se pudo conectar a la API LLM',
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

  const saveConfig = () => {
    setSaving(true);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast({
        title: 'Configuración Guardada',
        description: 'La configuración de LLM se ha guardado correctamente'
      });

      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConfig: LLMConfig = {
      apiUrl: 'http://127.0.0.1:5000/v1/chat/completions',
      model: 'local-model',
      temperature: '0.7',
      maxTokens: '2000'
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
            <Server className="h-5 w-5" />
            <span>API LLM</span>
          </div>
          <Badge variant={connectionStatus.status === 'connected' ? 'default' : connectionStatus.status === 'disconnected' ? 'destructive' : 'outline'}>
            {connectionStatus.status === 'connected' ? 'Conectado' : connectionStatus.status === 'disconnected' ? 'Desconectado' : 'Sin verificar'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configura la API de generación de texto (Chat Completions)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="llm-url">URL de la API</Label>
          <Input
            id="llm-url"
            placeholder="http://127.0.0.1:5000/v1/chat/completions"
            value={config.apiUrl}
            onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Compatible con OpenAI Chat Completions API
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-model">Modelo</Label>
          <div className="flex gap-2">
            <Select
              value={config.model}
              onValueChange={(value) => setConfig({ ...config, model: value })}
              className="flex-1"
            >
              <SelectTrigger id="llm-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="O escribir nombre personalizado"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="flex-[2]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperatura: {parseFloat(config.temperature).toFixed(2)}
          </Label>
          <div className="flex gap-4 items-center">
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[parseFloat(config.temperature)]}
              onValueChange={([value]) => setConfig({ ...config, temperature: value.toString() })}
              className="flex-1"
            />
            {connectionStatus.latency && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                <span>{connectionStatus.latency}ms</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Valores más bajos = respuestas más deterministas, más altos = más creativas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-tokens">Máximo de Tokens: {config.maxTokens}</Label>
          <Slider
            id="max-tokens"
            min={256}
            max={4096}
            step={256}
            value={[parseInt(config.maxTokens)]}
            onValueChange={([value]) => setConfig({ ...config, maxTokens: value.toString() })}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Límite de tokens en la respuesta del modelo
          </p>
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
            <li>Compatible con OpenAI Chat Completions API</li>
            <li>Puedes usar Text Generation WebUI como endpoint</li>
            <li>Para Text Gen WebUI, usa la ruta <code className="bg-background px-1 py-0.5 rounded">/v1/chat/completions</code></li>
            <li>El modelo debe estar cargado y disponible</li>
            <li>Temperatura recomendada: 0.7 para respuestas balanceadas</li>
          </ul>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            Configuraciones Predefinidas:
          </p>
          
          <div className="grid gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => setConfig({
                ...config,
                apiUrl: 'http://127.0.0.1:5000/v1/chat/completions',
                model: 'local-model'
              })}
            >
              Text Generation WebUI (local)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => setConfig({
                ...config,
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4'
              })}
            >
              OpenAI (GPT-4)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => setConfig({
                ...config,
                apiUrl: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-opus'
              })}
            >
              Anthropic (Claude 3)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

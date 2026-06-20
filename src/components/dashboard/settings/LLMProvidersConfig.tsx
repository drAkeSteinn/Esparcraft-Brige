'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server, Plus, Trash2, Edit2, Check, X, RefreshCw, TestTube,
  ChevronDown, AlertCircle, Brain, Wrench, Star, Cpu, Key, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LLMProviderConfig, LLMProviderInput, LLMProviderType, PROVIDERS, PROVIDER_TYPES,
} from '@/lib/llm/types';
import { toast } from '@/hooks/use-toast';

interface LLMProvidersConfigProps {
  onConfigSaved?: () => void;
}

export default function LLMProvidersConfig({ onConfigSaved }: LLMProvidersConfigProps) {
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProviderConfig | null>(null);
  const [deleteProvider, setDeleteProvider] = useState<LLMProviderConfig | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/llm/providers');
      const result = await res.json();
      if (result.success) {
        setProviders(result.data);
      } else {
        console.error('Error loading providers:', result.error);
      }
    } catch (e) {
      console.error('Error loading providers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProviders();
  }, [loadProviders]);

  const handleCreate = () => {
    setEditingProvider(null);
    setDialogOpen(true);
  };

  const handleEdit = (provider: LLMProviderConfig) => {
    setEditingProvider(provider);
    setDialogOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/llm/providers/${id}/set-default`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast({
          title: 'Proveedor activo',
          description: `"${result.data.name}" ahora se usa para los triggers`,
        });
        loadProviders();
        onConfigSaved?.();
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al cambiar proveedor activo',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteProvider) return;
    try {
      const res = await fetch(`/api/llm/providers/${deleteProvider.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Proveedor eliminado' });
        setDeleteProvider(null);
        loadProviders();
        onConfigSaved?.();
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al eliminar',
        variant: 'destructive',
      });
    }
  };

  const activeProvider = providers.find((p) => p.isDefault) || providers[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          <span>Proveedores LLM</span>
        </CardTitle>
        <CardDescription>
          Configura múltiples proveedores (Ollama, OpenAI, Grok, Claude, Custom). El proveedor
          marcado como activo se usa en todos los triggers de chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proveedor activo */}
        {activeProvider && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2 h-2 rounded-full ${PROVIDERS[activeProvider.type].color}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{activeProvider.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {PROVIDERS[activeProvider.type].label}
                  </Badge>
                  <Badge variant="default" className="text-[10px] h-4 px-1 gap-0.5">
                    <Star className="h-2.5 w-2.5" />
                    Activo
                  </Badge>
                  {activeProvider.reasoning && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                      <Brain className="h-2.5 w-2.5" />
                      Reasoning
                    </Badge>
                  )}
                  {activeProvider.toolCalling && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                      <Wrench className="h-2.5 w-2.5" />
                      Tools
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {activeProvider.model} · {activeProvider.temperature.toFixed(1)}° · {activeProvider.maxTokens} tok
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de proveedores */}
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando proveedores...</p>
        ) : providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay proveedores configurados</p>
            <p className="text-xs mt-1">Crea tu primer proveedor LLM</p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p}
                onEdit={() => handleEdit(p)}
                onSetDefault={() => handleSetDefault(p.id)}
                onDelete={() => setDeleteProvider(p)}
              />
            ))}
          </div>
        )}

        {/* Botón crear */}
        <Button onClick={handleCreate} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo proveedor
        </Button>

        {/* Info */}
        <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">¿Cómo funciona?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Crea uno o varios proveedores (locales o en la nube)</li>
            <li>Marca uno como <strong>activo</strong> — ese se usará en todos los triggers de chat</li>
            <li><strong>Reasoning</strong>: activa modo razonamiento (modelos o1, deepseek-r1, grok-3-reasoning)</li>
            <li><strong>Tool calling</strong>: permite al LLM llamar funciones definidas en el sistema</li>
            <li>Puedes cambiar el proveedor activo en cualquier momento</li>
          </ul>
        </div>
      </CardContent>

      {/* Dialog de crear/editar */}
      <ProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingProvider}
        onSaved={() => {
          setDialogOpen(false);
          loadProviders();
          onConfigSaved?.();
        }}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!deleteProvider} onOpenChange={(o) => !o && setDeleteProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteProvider?.name}</strong> ({PROVIDERS[deleteProvider?.type ?? 'custom']?.label}).
              {deleteProvider?.isDefault && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ Este es el proveedor activo. Al eliminarlo, se activará automáticamente el primer proveedor restante.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================
// Fila de proveedor
// ============================================================

function ProviderRow({
  provider, onEdit, onSetDefault, onDelete,
}: {
  provider: LLMProviderConfig;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/llm/providers/${provider.id}/test`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setTestResult({
          connected: result.data.connected,
          message: result.data.message,
        });
        toast({
          title: result.data.connected ? 'Conexión exitosa' : 'Sin conexión',
          description: result.data.message,
          variant: result.data.connected ? 'default' : 'destructive',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      setTestResult({
        connected: false,
        message: e instanceof Error ? e.message : 'Error al probar',
      });
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al probar conexión',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const info = PROVIDERS[provider.type];

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${info.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{provider.name}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">{info.label}</Badge>
            {provider.isDefault && (
              <Badge variant="default" className="text-[10px] h-4 px-1 gap-0.5">
                <Star className="h-2.5 w-2.5" />
                Activo
              </Badge>
            )}
            {provider.reasoning && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                <Brain className="h-2.5 w-2.5" />
                Reasoning
              </Badge>
            )}
            {provider.toolCalling && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                <Wrench className="h-2.5 w-2.5" />
                Tools
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
            {provider.model} · {provider.apiUrl}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!provider.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={onSetDefault}
              title="Marcar como activo"
            >
              <Star className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={handleTest}
            disabled={testing}
            title="Probar conexión"
          >
            {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit} title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onDelete}
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {testResult && (
        <div className={`text-xs p-2 rounded ${testResult.connected ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
          {testResult.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Dialog de crear/editar proveedor
// ============================================================

function ProviderDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LLMProviderConfig | null;
  onSaved: () => void;
}) {
  // Form state
  const [form, setForm] = useState<LLMProviderInput>(() => ({
    name: '',
    type: 'ollama',
    apiUrl: PROVIDERS.ollama.defaultApiUrl,
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2048,
    reasoning: false,
    toolCalling: false,
    isDefault: false,
  }));

  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Cargar datos del provider al abrir el dialog (edición) o resetear (creación).
  // Los setState aquí son legítimos: sincronizan el formulario con la prop `editing`
  // cuando el dialog se abre, no derivan de otro estado.
  useEffect(() => {
    if (open) {
      if (editing) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          name: editing.name,
          type: editing.type,
          apiUrl: editing.apiUrl,
          apiKey: '', // no mostrar la key guardada por seguridad; el backend la mantiene si viene vacío
          model: editing.model,
          temperature: editing.temperature,
          maxTokens: editing.maxTokens,
          reasoning: editing.reasoning,
          toolCalling: editing.toolCalling,
          isDefault: editing.isDefault,
        });
      } else {
        setForm({
          name: '',
          type: 'ollama',
          apiUrl: PROVIDERS.ollama.defaultApiUrl,
          apiKey: '',
          model: '',
          temperature: 0.7,
          maxTokens: 2048,
          reasoning: false,
          toolCalling: false,
          isDefault: false,
        });
      }
      setAvailableModels([]);
      setModelsLoaded(false);
      setShowApiKey(false);
    }
  }, [open, editing]);

  // Cuando cambia el tipo, actualizar URL y modelo por defecto
  const handleTypeChange = (type: LLMProviderType) => {
    const info = PROVIDERS[type];
    setForm((prev) => ({
      ...prev,
      type,
      apiUrl: info.defaultApiUrl,
      apiKey: info.requiresApiKey ? prev.apiKey : '',
      reasoning: info.supportsReasoning ? prev.reasoning : false,
      toolCalling: info.supportsToolCalling ? prev.toolCalling : false,
    }));
    setAvailableModels([]);
    setModelsLoaded(false);
  };

  const handleLoadModels = async () => {
    if (!form.apiUrl.trim()) {
      toast({ title: 'Error', description: 'Primero ingresa la URL', variant: 'destructive' });
      return;
    }
    if (PROVIDERS[form.type].requiresApiKey && !form.apiKey?.trim()) {
      toast({ title: 'Error', description: 'Este proveedor requiere API key', variant: 'destructive' });
      return;
    }

    setLoadingModels(true);
    try {
      const res = await fetch('/api/llm/list-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          apiUrl: form.apiUrl,
          apiKey: form.apiKey,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const models = result.data.models || [];
        const knownModels = result.data.knownModels || [];
        // Combinar modelos disponibles con conocidos (sin duplicados)
        const all = Array.from(new Set([...models, ...knownModels]));
        setAvailableModels(all);
        setModelsLoaded(true);
        toast({
          title: 'Modelos cargados',
          description: `${models.length} modelos disponibles${knownModels.length > 0 ? ` + ${knownModels.length} conocidos` : ''}`,
        });
        // Si no hay modelo seleccionado y hay disponibles, seleccionar el primero
        if (!form.model && all.length > 0) {
          setForm((prev) => ({ ...prev, model: all[0] }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      toast({
        title: 'Error al cargar modelos',
        description: e instanceof Error ? e.message : 'No se pudieron cargar los modelos. Puedes escribir el nombre manualmente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    if (!form.apiUrl.trim()) {
      toast({ title: 'Error', description: 'La URL es obligatoria', variant: 'destructive' });
      return;
    }
    if (!form.model.trim()) {
      toast({ title: 'Error', description: 'El modelo es obligatorio', variant: 'destructive' });
      return;
    }
    if (PROVIDERS[form.type].requiresApiKey && !form.apiKey?.trim() && !editing) {
      toast({ title: 'Error', description: 'Este proveedor requiere API key', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      // Si estamos editando y no se ingresó API key, enviar undefined para que el backend la mantenga
      if (editing && !form.apiKey?.trim()) {
        payload.apiKey = undefined;
      }

      const url = editing ? `/api/llm/providers/${editing.id}` : '/api/llm/providers';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: editing ? 'Proveedor actualizado' : 'Proveedor creado',
          description: result.data.isDefault ? 'Marcado como activo automáticamente' : undefined,
        });
        onSaved();
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al guardar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const info = PROVIDERS[form.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor LLM'}</DialogTitle>
          <DialogDescription>
            Configura un proveedor de LLM. Los campos cambian según el tipo seleccionado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Tipo de proveedor (dropdown principal) */}
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={form.type} onValueChange={(v) => handleTypeChange(v as LLMProviderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((p) => (
                    <SelectItem key={p.type} value={p.type}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="provider-name">Nombre *</Label>
              <Input
                id="provider-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={`Ej: Mi ${info.label} local`}
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="provider-url">URL de la API *</Label>
              <Input
                id="provider-url"
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder={info.defaultApiUrl}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {form.type === 'ollama' && 'URL base de Ollama (sin /v1/...). El adapter añade los endpoints.'}
                {form.type === 'openai' && 'URL base de OpenAI. Default: https://api.openai.com/v1'}
                {form.type === 'grok' && 'URL base de xAI. Default: https://api.x.ai/v1'}
                {form.type === 'anthropic' && 'URL base de Anthropic. Default: https://api.anthropic.com/v1'}
                {form.type === 'custom' && 'URL del endpoint OpenAI-compatible (LM Studio, vLLM, etc.)'}
              </p>
            </div>

            {/* API Key (solo si requiere) */}
            {info.requiresApiKey && (
              <div className="space-y-2">
                <Label htmlFor="provider-key" className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  API Key *
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="provider-key"
                      type={showApiKey ? 'text' : 'password'}
                      value={form.apiKey || ''}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder={editing ? '•••••••• (dejar vacío para mantener la actual)' : 'sk-...'}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  La API key se guarda en la base de datos local del servidor.
                </p>
              </div>
            )}

            {/* Modelo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                Modelo *
              </Label>
              <div className="flex gap-2">
                {availableModels.length > 0 ? (
                  <Select
                    value={form.model}
                    onValueChange={(v) => setForm({ ...form, model: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona un modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder={info.knownModels[0] || 'nombre-del-modelo'}
                    className="flex-1 font-mono text-sm"
                  />
                )}
                {info.supportsModelListing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadModels}
                    disabled={loadingModels}
                    className="flex-shrink-0"
                  >
                    {loadingModels ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Cargar
                      </>
                    )}
                  </Button>
                )}
              </div>
              {!modelsLoaded && info.knownModels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">Sugeridos:</span>
                  {info.knownModels.slice(0, 5).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, model: m })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 font-mono"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Temperatura y max tokens */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temperatura: {form.temperature.toFixed(2)}</Label>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[form.temperature]}
                  onValueChange={([v]) => setForm({ ...form, temperature: v })}
                  disabled={form.reasoning}
                />
                <p className="text-[10px] text-muted-foreground">
                  {form.reasoning ? 'Deshabilitado en modo reasoning' : 'Menor = determinista, mayor = creativo'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max tokens: {form.maxTokens}</Label>
                <Slider
                  min={256}
                  max={8192}
                  step={256}
                  value={[form.maxTokens]}
                  onValueChange={([v]) => setForm({ ...form, maxTokens: v })}
                />
                <p className="text-[10px] text-muted-foreground">Límite de tokens de la respuesta</p>
              </div>
            </div>

            {/* Toggles: reasoning y tool calling */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`flex items-start justify-between p-3 rounded-md border ${form.reasoning ? 'bg-muted/50 border-foreground/30' : 'bg-muted/20'}`}>
                <div className="space-y-0.5 pr-3">
                  <Label htmlFor="toggle-reasoning" className="flex items-center gap-1.5 cursor-pointer">
                    <Brain className="h-3.5 w-3.5" />
                    Reasoning
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Activa modo razonamiento (o1, deepseek-r1, grok-3-reasoning)
                  </p>
                  {!info.supportsReasoning && (
                    <p className="text-[10px] text-amber-600">No soportado por {info.label}</p>
                  )}
                </div>
                <Switch
                  id="toggle-reasoning"
                  checked={form.reasoning && info.supportsReasoning}
                  disabled={!info.supportsReasoning}
                  onCheckedChange={(v) => setForm({ ...form, reasoning: v })}
                />
              </div>

              <div className={`flex items-start justify-between p-3 rounded-md border ${form.toolCalling ? 'bg-muted/50 border-foreground/30' : 'bg-muted/20'}`}>
                <div className="space-y-0.5 pr-3">
                  <Label htmlFor="toggle-tools" className="flex items-center gap-1.5 cursor-pointer">
                    <Wrench className="h-3.5 w-3.5" />
                    Tool calling
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Permite al LLM llamar funciones del sistema
                  </p>
                  {!info.supportsToolCalling && (
                    <p className="text-[10px] text-amber-600">No soportado por {info.label}</p>
                  )}
                </div>
                <Switch
                  id="toggle-tools"
                  checked={form.toolCalling && info.supportsToolCalling}
                  disabled={!info.supportsToolCalling}
                  onCheckedChange={(v) => setForm({ ...form, toolCalling: v })}
                />
              </div>
            </div>

            {/* Marcar como activo */}
            <div className="flex items-center justify-between p-3 rounded-md border">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-default" className="flex items-center gap-1.5 cursor-pointer">
                  <Star className="h-3.5 w-3.5" />
                  Usar como proveedor activo
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Si se activa, este proveedor se usará en todos los triggers de chat
                </p>
              </div>
              <Switch
                id="toggle-default"
                checked={form.isDefault}
                onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                {editing ? 'Guardar cambios' : 'Crear proveedor'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

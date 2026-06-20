'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Trash2, Edit2, Check, X, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

// ============================================================
// Tipos
// ============================================================

interface NPCAction {
  id: string;
  npcId: string;
  name: string;
  key: string;
  description: string;
  parameters?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface NPCActionsPanelProps {
  /** ID del NPC que se está editando. null si es creación nueva (no hay acciones aún). */
  npcId: string | null;
  /** Deshabilitar cuando el NPC aún no existe (modo creación). */
  disabled?: boolean;
}

// Regex de validación de key: empieza con letra o underscore, luego letras/números/underscore.
const KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// ============================================================
// Componente principal
// ============================================================

export default function NPCActionsPanel({ npcId, disabled }: NPCActionsPanelProps) {
  const [actions, setActions] = useState<NPCAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<NPCAction | null>(null);
  const [deleteAction, setDeleteAction] = useState<NPCAction | null>(null);
  const [showTemplatesList, setShowTemplatesList] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    key: '',
    description: '',
    parameters: '',
  });

  const loadActions = useCallback(async () => {
    if (!npcId) {
      setActions([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/npcs/${npcId}/actions`);
      const result = await res.json();
      if (result.success) {
        setActions(result.data);
      } else {
        console.error('Error loading actions:', result.error);
      }
    } catch (e) {
      console.error('Error loading actions:', e);
    } finally {
      setLoading(false);
    }
  }, [npcId]);

  // Carga inicial de acciones del NPC.
  // El setState dentro de loadActions es legítimo (carga de datos tras fetch),
  // no un derivado del estado.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActions();
  }, [loadActions]);

  const resetForm = () => {
    setForm({ name: '', key: '', description: '', parameters: '' });
    setEditingAction(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (action: NPCAction) => {
    setEditingAction(action);
    setForm({
      name: action.name,
      key: action.key,
      description: action.description,
      parameters: action.parameters ? JSON.stringify(action.parameters, null, 2) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!npcId) {
      toast({
        title: 'Error',
        description: 'Guarda primero el NPC para poder añadirle acciones.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    if (!form.key.trim()) {
      toast({ title: 'Error', description: 'La key es obligatoria', variant: 'destructive' });
      return;
    }
    if (!KEY_REGEX.test(form.key.trim())) {
      toast({
        title: 'Key inválida',
        description: 'Solo letras, números y underscore. Debe empezar con letra o underscore.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: 'Error', description: 'La descripción es obligatoria', variant: 'destructive' });
      return;
    }

    // Parseo opcional del JSON schema de parámetros.
    let parameters: Record<string, any> | null = null;
    if (form.parameters.trim()) {
      try {
        const parsed = JSON.parse(form.parameters);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parameters = parsed;
        } else {
          throw new Error('El JSON debe ser un objeto');
        }
      } catch (e) {
        toast({
          title: 'Error',
          description: e instanceof Error
            ? `Parámetros inválidos: ${e.message}`
            : 'Los parámetros no son JSON válido',
          variant: 'destructive',
        });
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      key: form.key.trim(),
      description: form.description.trim(),
      parameters,
    };

    try {
      const url = editingAction
        ? `/api/npcs/${npcId}/actions/${editingAction.id}`
        : `/api/npcs/${npcId}/actions`;
      const method = editingAction ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: editingAction ? 'Acción actualizada' : 'Acción creada',
          description: `La key "${form.key.trim()}" estará disponible como tool en el chat`,
        });
        setDialogOpen(false);
        resetForm();
        loadActions();
      } else {
        throw new Error(result.error || 'Error al guardar acción');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al guardar acción',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteAction || !npcId) return;
    try {
      const res = await fetch(`/api/npcs/${npcId}/actions/${deleteAction.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Acción eliminada' });
        setDeleteAction(null);
        loadActions();
      } else {
        throw new Error(result.error || 'Error al eliminar');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al eliminar acción',
        variant: 'destructive',
      });
    }
  };

  const isDisabled = disabled || !npcId;
  // La key es válida si está vacía (aún no se ha escrito) o cumple el regex.
  const keyValid = form.key.trim() === '' || KEY_REGEX.test(form.key.trim());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Acciones del NPC
              </CardTitle>
              <CardDescription>
                Define acciones que el LLM puede ejecutar durante el chat (vender, saludar, golpear, etc.)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowTemplatesList((v) => !v)}
                disabled={isDisabled}
              >
                Plantillas
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreate}
                disabled={isDisabled}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuevo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDisabled && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">
                {npcId
                  ? 'Editor de acciones deshabilitado.'
                  : 'Guarda el NPC primero para poder añadirle acciones.'}
              </p>
            </div>
          )}

          {showTemplatesList && (
            <div className="border rounded-md p-2 space-y-1 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  Plantillas de acciones
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowTemplatesList(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="px-2 py-3 text-center text-xs text-muted-foreground border border-dashed rounded">
                Próximamente: plantillas predefinidas de acciones comunes.
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Cargando acciones...</p>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin acciones</p>
              <p className="text-xs mt-1">
                {isDisabled
                  ? 'Disponible tras guardar el NPC'
                  : 'Crea la primera acción para que el NPC pueda ejecutarla durante el chat'}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-1">
                {actions.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    onEdit={() => handleOpenEdit(action)}
                    onDelete={() => setDeleteAction(action)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {actions.length > 0 && (
            <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
              <p className="font-medium mb-1">Keys disponibles para tool calling:</p>
              <div className="flex flex-wrap gap-1">
                {actions.map((a) => (
                  <code
                    key={a.id}
                    className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono"
                    title={a.description}
                  >
                    {a.key}
                  </code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: crear/editar acción */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAction ? 'Editar acción' : 'Nueva acción'}
            </DialogTitle>
            <DialogDescription>
              La key se usará como nombre de la función en tool calling. El LLM verá la descripción
              para saber cuándo usarla.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="action-name">Nombre *</Label>
                <Input
                  id="action-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Vender"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="action-key">Key *</Label>
                <Input
                  id="action-key"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="Ej: vender"
                  className="font-mono"
                />
                <p className={`text-[10px] ${keyValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {keyValid
                    ? (<>Se usará como <code className="font-mono">{form.key || 'key'}</code> en tool calling.</>)
                    : 'Solo letras, números y underscore. Debe empezar con letra o underscore.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action-desc">Descripción *</Label>
              <Textarea
                id="action-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Vender un item al jugador cuando pide comprar algo"
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground">
                El LLM usa esta descripción para decidir cuándo ejecutar la acción.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action-params">Parámetros (JSON schema, opcional)</Label>
              <Textarea
                id="action-params"
                value={form.parameters}
                onChange={(e) => setForm({ ...form, parameters: e.target.value })}
                placeholder='{"type":"object","properties":{"item":{"type":"string"},"precio":{"type":"number"}}}'
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Esquema JSON de los parámetros que la acción necesita. Dejar vacío si no requiere parámetros.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              {editingAction ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteAction} onOpenChange={(o) => !o && setDeleteAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteAction?.name}</strong> (
              <code className="font-mono">{deleteAction?.key}</code>).
              Esta acción no se puede deshacer. El NPC ya no podrá ejecutar esta acción durante el chat.
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
    </div>
  );
}

// ============================================================
// Fila de acción (expandible)
// ============================================================

function ActionRow({
  action,
  onEdit,
  onDelete,
}: {
  action: NPCAction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasParams = Boolean(
    action.parameters &&
    typeof action.parameters === 'object' &&
    Object.keys(action.parameters).length > 0,
  );

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-shrink-0">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
              {action.key}
            </Badge>
            <span className="text-sm font-medium truncate">{action.name}</span>
            {hasParams && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                con params
              </Badge>
            )}
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {action.description}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {expanded && (
        <div className="px-3 pb-2 pt-1 border-t bg-muted/20 text-xs space-y-2">
          <div>
            <span className="text-muted-foreground">Descripción:</span>
            <p className="mt-0.5 break-words">{action.description}</p>
          </div>
          {hasParams ? (
            <div>
              <span className="text-muted-foreground">Parámetros (JSON schema):</span>
              <pre className="mt-0.5 p-1.5 bg-background rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(action.parameters, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <span className="text-muted-foreground">Parámetros:</span>{' '}
              <span className="italic">(sin parámetros)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, AlertCircle, Hash, Type, FileText, Check, ChevronDown, ChevronRight, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NPCAttribute, AttributeTemplate, AttributeType, formatAttributeValue } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface NPCAttributesPanelProps {
  /** ID del NPC que se está editando. null si es creación nueva (no hay atributos aún). */
  npcId: string | null;
  /** Deshabilitar cuando el NPC aún no existe (modo creación) */
  disabled?: boolean;
}

export default function NPCAttributesPanel({ npcId, disabled }: NPCAttributesPanelProps) {
  const [attributes, setAttributes] = useState<NPCAttribute[]>([]);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<NPCAttribute | null>(null);
  const [deleteAttr, setDeleteAttr] = useState<NPCAttribute | null>(null);
  const [showTemplatesList, setShowTemplatesList] = useState(false);

  // Form state
  const [form, setForm] = useState<{
    name: string;
    key: string;
    type: AttributeType;
    valueText: string;
    valueNumber: string;
    minValue: string;
    maxValue: string;
  }>({
    name: '',
    key: '',
    type: 'numeric',
    valueText: '',
    valueNumber: '',
    minValue: '',
    maxValue: '',
  });

  const loadAttributes = useCallback(async () => {
    if (!npcId) {
      setAttributes([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/npcs/${npcId}/attributes`);
      const result = await res.json();
      if (result.success) {
        setAttributes(result.data);
      } else {
        console.error('Error loading attributes:', result.error);
      }
    } catch (e) {
      console.error('Error loading attributes:', e);
    } finally {
      setLoading(false);
    }
  }, [npcId]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/attributes');
      const result = await res.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (e) {
      console.error('Error loading templates:', e);
    }
  }, []);

  // Carga inicial de atributos del NPC y plantillas globales.
  // Los setState dentro de loadAttributes/loadTemplates son legítimos
  // (carga de datos asíncrona tras fetch), no derivados del estado.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttributes();
  }, [loadAttributes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, [loadTemplates]);

  const resetForm = () => {
    setForm({
      name: '',
      key: '',
      type: 'numeric',
      valueText: '',
      valueNumber: '',
      minValue: '',
      maxValue: '',
    });
    setEditingAttr(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (attr: NPCAttribute) => {
    setEditingAttr(attr);
    setForm({
      name: attr.name,
      key: attr.key,
      type: attr.type,
      valueText: attr.valueText ?? '',
      valueNumber: attr.valueNumber != null ? String(attr.valueNumber) : '',
      minValue: attr.minValue != null ? String(attr.minValue) : '',
      maxValue: attr.maxValue != null ? String(attr.maxValue) : '',
    });
    setDialogOpen(true);
  };

  const handleFromTemplate = async (templateId: string) => {
    if (!npcId) return;
    try {
      const res = await fetch(`/api/npcs/${npcId}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTemplate: true, templateId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: 'Atributo añadido',
          description: `Plantilla aplicada al NPC`,
        });
        loadAttributes();
        setShowTemplatesList(false);
      } else {
        throw new Error(result.error || 'Error al añadir atributo');
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al añadir atributo desde plantilla',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!npcId) {
      toast({
        title: 'Error',
        description: 'Guarda primero el NPC para poder añadirle atributos.',
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
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.key.trim())) {
      toast({
        title: 'Key inválida',
        description: 'Solo letras, números y underscore. Debe empezar con letra o underscore.',
        variant: 'destructive',
      });
      return;
    }

    // Validaciones numéricas
    if (form.type === 'numeric') {
      const min = form.minValue.trim() !== '' ? parseFloat(form.minValue) : null;
      const max = form.maxValue.trim() !== '' ? parseFloat(form.maxValue) : null;
      const val = form.valueNumber.trim() !== '' ? parseFloat(form.valueNumber) : null;
      if (min !== null && max !== null && min > max) {
        toast({ title: 'Error', description: 'Min no puede ser mayor que Max', variant: 'destructive' });
        return;
      }
      if (val !== null && min !== null && val < min) {
        toast({ title: 'Error', description: 'El valor actual no puede ser menor que Min', variant: 'destructive' });
        return;
      }
      if (val !== null && max !== null && val > max) {
        toast({ title: 'Error', description: 'El valor actual no puede ser mayor que Max', variant: 'destructive' });
        return;
      }
    }

    const payload: any = {
      name: form.name.trim(),
      key: form.key.trim(),
      type: form.type,
    };

    if (form.type === 'numeric') {
      if (form.minValue.trim() !== '') payload.minValue = parseFloat(form.minValue);
      if (form.maxValue.trim() !== '') payload.maxValue = parseFloat(form.maxValue);
      if (form.valueNumber.trim() !== '') payload.valueNumber = parseFloat(form.valueNumber);
    } else {
      // 'text' y 'list' guardan su valor en valueText
      if (form.valueText.trim() !== '') payload.valueText = form.valueText.trim();
    }

    try {
      const url = editingAttr
        ? `/api/npcs/${npcId}/attributes/${editingAttr.id}`
        : `/api/npcs/${npcId}/attributes`;
      const method = editingAttr ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: editingAttr ? 'Atributo actualizado' : 'Atributo creado',
          description: `{{${form.key.trim()}}} estará disponible en la card del NPC`,
        });
        setDialogOpen(false);
        resetForm();
        loadAttributes();
      } else {
        throw new Error(result.error || 'Error al guardar atributo');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al guardar atributo',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteAttr || !npcId) return;
    try {
      const res = await fetch(`/api/npcs/${npcId}/attributes/${deleteAttr.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Atributo eliminado' });
        setDeleteAttr(null);
        loadAttributes();
      } else {
        throw new Error(result.error || 'Error al eliminar');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al eliminar atributo',
        variant: 'destructive',
      });
    }
  };

  const isDisabled = disabled || !npcId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Atributos del NPC
              </CardTitle>
              <CardDescription>
                Define atributos numéricos (min/max/actual) o de texto. Usa <code className="px-1 py-0.5 bg-muted rounded text-xs">{'{{key}}'}</code> en cualquier parte de la card para resolverlos.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {templates.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTemplatesList((v) => !v)}
                  disabled={isDisabled}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Plantillas
                </Button>
              )}
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
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">
                {npcId
                  ? 'Editor de atributos deshabilitado.'
                  : 'Guarda el NPC primero para poder añadirle atributos.'}
              </p>
            </div>
          )}

          {showTemplatesList && templates.length > 0 && (
            <div className="border rounded-md p-2 space-y-1 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  Aplicar plantilla ({templates.length}):
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
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleFromTemplate(t.id)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs hover:bg-background transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {t.type === 'numeric' ? (
                          <Hash className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Type className="h-3 w-3 text-purple-500 flex-shrink-0" />
                        )}
                        <span className="truncate font-medium">{t.name}</span>
                        <code className="text-[10px] text-muted-foreground">{`{{${t.key}}}`}</code>
                      </div>
                      <Plus className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Cargando atributos...</p>
          ) : attributes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin atributos</p>
              <p className="text-xs mt-1">
                {isDisabled ? 'Disponible tras guardar el NPC' : 'Crea el primer atributo o aplica una plantilla'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attributes.map((attr) => (
                <AttributeRow
                  key={attr.id}
                  attr={attr}
                  onEdit={() => handleOpenEdit(attr)}
                  onDelete={() => setDeleteAttr(attr)}
                />
              ))}
            </div>
          )}

          {attributes.length > 0 && (
            <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
              <p className="font-medium mb-1">Vista previa de variables disponibles:</p>
              <div className="flex flex-wrap gap-1">
                {attributes.map((a) => (
                  <code
                    key={a.id}
                    className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono"
                    title={`${a.name} = ${formatAttributeValue(a)}`}
                  >
                    {'{{'}{a.key}{'}}'} = {formatAttributeValue(a)}
                  </code>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: crear/editar atributo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAttr ? 'Editar atributo' : 'Nuevo atributo'}
            </DialogTitle>
            <DialogDescription>
              Define un atributo numérico (con min/max/actual) o de texto. La key se usará como
              {' '}<code>{`{{key}}`}</code>{' '}en la card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="attr-name">Nombre *</Label>
                <Input
                  id="attr-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Fuerza"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attr-key">Key *</Label>
                <Input
                  id="attr-key"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="Ej: fuerza"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se usará como <code>{`{{${form.key || 'key'}}}`}</code>
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attr-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as AttributeType })}
              >
                <SelectTrigger id="attr-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5" />
                      <span>Numérico (min/max/actual)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5" />
                      <span>Texto</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="list">
                    <div className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5" />
                      <span>Lista (valores separados por comas)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === 'numeric' ? (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-md border bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="attr-min">Min</Label>
                  <Input
                    id="attr-min"
                    type="number"
                    value={form.minValue}
                    onChange={(e) => setForm({ ...form, minValue: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="attr-current">Actual</Label>
                  <Input
                    id="attr-current"
                    type="number"
                    value={form.valueNumber}
                    onChange={(e) => setForm({ ...form, valueNumber: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="attr-max">Max</Label>
                  <Input
                    id="attr-max"
                    type="number"
                    value={form.maxValue}
                    onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <p className="col-span-3 text-[10px] text-muted-foreground">
                  Formato al resolver: <code>{`{{${form.key || 'key'}}}`}</code>{' → '}
                  <strong>
                    {form.valueNumber || '0'}
                    {form.maxValue ? `/${form.maxValue}` : ''}
                  </strong>
                </p>
              </div>
            ) : form.type === 'list' ? (
              <div className="space-y-1.5 p-3 rounded-md border bg-muted/20">
                <Label htmlFor="attr-list">Valores de la lista (separados por comas)</Label>
                <Textarea
                  id="attr-list"
                  value={form.valueText}
                  onChange={(e) => setForm({ ...form, valueText: e.target.value })}
                  placeholder="Ej: casa, edificio, farmacia, templo"
                  rows={2}
                />
                <p className="text-[10px] text-muted-foreground">
                  Separa los valores con comas. Se resolverá como lista:
                </p>
                <div className="text-[10px] text-muted-foreground font-mono whitespace-pre-line pl-2 border-l-2 border-muted">
                  {form.valueText
                    ? form.valueText.split(',').map(s => s.trim()).filter(s => s).map((v, i) => `- ${v}`).join('\n')
                    : '- (vacío)'}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 p-3 rounded-md border bg-muted/20">
                <Label htmlFor="attr-text">Valor de texto</Label>
                <Textarea
                  id="attr-text"
                  value={form.valueText}
                  onChange={(e) => setForm({ ...form, valueText: e.target.value })}
                  placeholder="Ej: Alto, Medio, Bajo"
                  rows={2}
                />
                <p className="text-[10px] text-muted-foreground">
                  Formato al resolver: <code>{`{{${form.key || 'key'}}}`}</code>{' → '}
                  <strong>{form.valueText || '(vacío)'}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              {editingAttr ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteAttr} onOpenChange={(o) => !o && setDeleteAttr(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar atributo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteAttr?.name}</strong> (<code>{`{{${deleteAttr?.key}}}`}</code>).
              Esta acción no se puede deshacer. Las referencias <code>{`{{${deleteAttr?.key}}}`}</code> en la card ya no se resolverán.
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
// Fila de atributo
// ============================================================

function AttributeRow({
  attr,
  onEdit,
  onDelete,
}: {
  attr: NPCAttribute;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-shrink-0">
          {attr.type === 'numeric' ? (
            <Hash className="h-3.5 w-3.5 text-blue-500" />
          ) : attr.type === 'list' ? (
            <List className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Type className="h-3.5 w-3.5 text-purple-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{attr.name}</span>
            <code className="text-[10px] text-muted-foreground font-mono">{`{{${attr.key}}}`}</code>
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {attr.type === 'numeric' ? 'num' : attr.type === 'list' ? 'lista' : 'txt'}
            </Badge>
          </div>
        </div>
        <div className="flex-shrink-0 text-sm font-mono max-w-[200px] truncate" title={formatAttributeValue(attr)}>
          {attr.type === 'list'
            ? (attr.valueText
                ? `${attr.valueText.split(',').map(s => s.trim()).filter(s => s).length} elemento(s)`
                : <span className="text-muted-foreground text-xs">vacío</span>)
            : (formatAttributeValue(attr) || <span className="text-muted-foreground text-xs">vacío</span>)
          }
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
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
        <div className="px-3 pb-2 pt-1 border-t bg-muted/20 text-xs space-y-1">
          {attr.type === 'numeric' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-muted-foreground">Min:</span>{' '}
                <span className="font-mono">{attr.minValue ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actual:</span>{' '}
                <span className="font-mono">{attr.valueNumber ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max:</span>{' '}
                <span className="font-mono">{attr.maxValue ?? '—'}</span>
              </div>
            </div>
          )}
          {attr.type === 'text' && (
            <div>
              <span className="text-muted-foreground">Valor:</span>{' '}
              <span className="font-mono break-all">{attr.valueText || '(vacío)'}</span>
            </div>
          )}
          {attr.type === 'list' && (
            <div>
              <span className="text-muted-foreground">Valores:</span>
              <div className="font-mono whitespace-pre-line pl-2 mt-1">
                {attr.valueText
                  ? attr.valueText.split(',').map(s => s.trim()).filter(s => s).map((v, i) => (
                    <div key={i}>- {v}</div>
                  ))
                  : '(vacío)'}
              </div>
            </div>
          )}
          <div className="pt-1 text-muted-foreground">
            <span>Resolución: </span>
            <code className="font-mono">{`{{${attr.key}}}`}</code>
            <span> → </span>
            <strong>{formatAttributeValue(attr) || '(vacío)'}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para editar las propiedades de un elemento seleccionado
 * Permite editar nombre, descripción y otras propiedades
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Save, X, CheckCircle, AlertCircle, Building2, Landmark, User } from 'lucide-react';
import { MapBuilding, MapZone, MapNPC } from '@/lib/map/types';
import { useMapEditing } from '@/lib/map/useMapEditing';

interface EditElementPanelProps {
  element: MapBuilding | MapZone | MapNPC;
  onSave?: () => void;
  onCancel?: () => void;
}

export function EditElementPanel({ element, onSave, onCancel }: EditElementPanelProps) {
  const {
    saveBuilding,
    saveZone,
    saveNPC,
    saveElementName,
    isSaving,
    saveError,
    clearError,
    startEditing,
  } = useMapEditing();

  const [editedName, setEditedName] = useState(element.name);
  const [editedDescription, setEditedDescription] = useState(
    element.data?.description || element.data?.lore || ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Determinar el tipo de elemento
  const elementType = 'data' in element && element.data?.puebloId ? 'zone' :
                      'data' in element && element.data?.edificioId ? 'npc' :
                      'data' in element ? 'building' : 'building';

  // Iniciar edición al montar
  useEffect(() => {
    startEditing(elementType as any, element.id);
  }, [elementType, element.id, startEditing]);

  // Detectar cambios
  useEffect(() => {
    const nameChanged = editedName !== element.name;
    const descChanged = editedDescription !== (element.data?.description || element.data?.lore || '');
    setHasChanges(nameChanged || descChanged);
  }, [editedName, editedDescription, element]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    let success = false;

    // Guardar nombre si cambió
    if (editedName !== element.name) {
      success = await saveElementName(elementType as any, element.id, editedName);
    }

    // Guardar descripción si cambió (si existe el campo)
    if (editedDescription !== (element.data?.description || element.data?.lore || '')) {
      const updates: any = { name: editedName };
      if (element.data?.description !== undefined) {
        updates.description = editedDescription;
      } else if (element.data?.lore !== undefined) {
        updates.lore = editedDescription;
      }

      if (elementType === 'building') {
        success = await saveBuilding(element.id, updates);
      } else if (elementType === 'zone') {
        success = await saveZone(element.id, updates);
      } else if (elementType === 'npc') {
        success = await saveNPC(element.id, updates);
      }
    }

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSave?.();
      }, 1500);
    }
  }, [hasChanges, editedName, editedDescription, element, elementType, saveElementName, saveBuilding, saveZone, saveNPC, onSave]);

  const handleCancel = useCallback(() => {
    setEditedName(element.name);
    setEditedDescription(element.data?.description || element.data?.lore || '');
    setHasChanges(false);
    clearError();
    onCancel?.();
  }, [element, clearError, onCancel]);

  const getElementIcon = () => {
    if (elementType === 'zone') return <Landmark className="h-5 w-5 text-purple-500" />;
    if (elementType === 'npc') return <User className="h-5 w-5 text-orange-500" />;
    return <Building2 className="h-5 w-5 text-blue-500" />;
  };

  const getElementTypeLabel = () => {
    if (elementType === 'zone') return 'Zona/Pueblo';
    if (elementType === 'npc') return 'NPC';
    return 'Edificio';
  };

  return (
    <Card className="border-amber-500/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-amber-500" />
            Editar {getElementTypeLabel()}
          </div>
          <Badge variant={saveSuccess ? "default" : "secondary"}>
            {saveSuccess ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
            {saveSuccess ? 'Guardado' : element.id.slice(-8)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Edita las propiedades del elemento seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Icono y tipo */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {getElementIcon()}
          <div>
            <div className="font-medium">{getElementTypeLabel()}</div>
            <div className="text-xs text-muted-foreground">ID: {element.id}</div>
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nombre</label>
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="Nombre del elemento"
            className={editedName !== element.name ? 'border-amber-500' : ''}
          />
        </div>

        {/* Descripción */}
        {element.data?.description !== undefined || element.data?.lore !== undefined ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {element.data?.description !== undefined ? 'Descripción' : 'Lore'}
            </label>
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder={element.data?.description !== undefined ? 'Descripción del elemento' : 'Lore del elemento'}
              rows={4}
              className={editedDescription !== (element.data?.description || element.data?.lore || '') ? 'border-amber-500' : ''}
            />
          </div>
        ) : null}

        {/* Coordenadas (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Coordenadas</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-xs text-muted-foreground">X</div>
              <div className="font-mono">{element.coords.worldX.toFixed(2)}</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-xs text-muted-foreground">Z</div>
              <div className="font-mono">{element.coords.worldZ.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {saveError}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSaving}
            variant="outline"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground">
          💡 Los cambios se guardan automáticamente en el servidor.
        </p>
      </CardContent>
    </Card>
  );
}

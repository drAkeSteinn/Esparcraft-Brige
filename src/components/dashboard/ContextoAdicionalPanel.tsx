'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface ContextoAdicional {
  id: string;
  entityType: string;
  entityId: string;
  targetType: string;
  targetId: string;
  durationDays: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ContextoAdicionalPanelProps {
  entityType: 'npc' | 'edificio' | 'pueblo' | 'mundo';
  entityId: string | null;
  disabled?: boolean;
}

export default function ContextoAdicionalPanel({ entityType, entityId, disabled }: ContextoAdicionalPanelProps) {
  const [contexts, setContexts] = useState<ContextoAdicional[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteContext, setDeleteContext] = useState<ContextoAdicional | null>(null);

  const loadContexts = useCallback(async () => {
    if (!entityId) {
      setContexts([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/contextos-adicionales?entityType=${entityType}&entityId=${entityId}`);
      const result = await res.json();
      if (result.success) {
        setContexts(result.data);
      }
    } catch (e) {
      console.error('Error loading contexts:', e);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContexts();
  }, [loadContexts]);

  const handleDelete = async () => {
    if (!deleteContext) return;
    try {
      const res = await fetch(`/api/contextos-adicionales/${deleteContext.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Contexto eliminado' });
        setDeleteContext(null);
        loadContexts();
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  };

  const getDaysRemaining = (expiresAt: string): number => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getTargetLabel = (targetType: string): string => {
    const labels: Record<string, string> = {
      npc: 'NPC',
      edificio: 'Edificio',
      pueblo: 'Pueblo/Nación',
      mundo: 'Mundo',
    };
    return labels[targetType] || targetType;
  };

  const isDisabled = disabled || !entityId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Contextos Adicionales
            </CardTitle>
            <CardDescription className="text-xs">
              Lugares que esta entidad ha "visitado" y tiene acceso temporal a sus namespaces
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadContexts}
            disabled={loading || isDisabled}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isDisabled && (
          <div className="flex items-start gap-2 p-2 rounded-md border border-yellow-500/30 bg-yellow-500/5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-yellow-600" />
            <p className="text-xs text-muted-foreground">
              {entityId
                ? 'Panel deshabilitado.'
                : 'Guarda la entidad primero para poder gestionar sus contextos adicionales.'}
            </p>
          </div>
        )}

        {!isDisabled && loading && (
          <p className="text-xs text-muted-foreground py-2 text-center">Cargando...</p>
        )}

        {!isDisabled && !loading && contexts.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <MapPin className="h-6 w-6 mx-auto mb-1 opacity-30" />
            <p className="text-xs">Sin contextos adicionales</p>
            <p className="text-[10px] mt-0.5">
              Usa el trigger "nuevo_contexto" para dar acceso temporal a otros namespaces
            </p>
          </div>
        )}

        {!isDisabled && !loading && contexts.length > 0 && (
          <ScrollArea className="max-h-48">
            <div className="space-y-1.5">
              {contexts.map((ctx) => {
                const daysRemaining = getDaysRemaining(ctx.expiresAt);
                const isExpiringSoon = daysRemaining <= 1;
                return (
                  <div
                    key={ctx.id}
                    className="flex items-center gap-2 p-2 rounded-md border text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {getTargetLabel(ctx.targetType)}
                        </Badge>
                        <code className="text-[10px] font-mono text-muted-foreground truncate">
                          {ctx.targetId.length > 25 ? ctx.targetId.substring(0, 25) + '...' : ctx.targetId}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className={`h-2.5 w-2.5 ${isExpiringSoon ? 'text-red-500' : 'text-muted-foreground'}`} />
                        <span className={`text-[10px] ${isExpiringSoon ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          {daysRemaining > 0 ? `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}` : 'Expirado'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · expira {new Date(ctx.expiresAt).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => setDeleteContext(ctx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {!isDisabled && contexts.length > 0 && (
          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            Estos contextos se eliminan automáticamente al expirar. También puedes eliminarlos manualmente.
          </p>
        )}
      </CardContent>

      <AlertDialog open={!!deleteContext} onOpenChange={(o) => !o && setDeleteContext(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contexto adicional?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el acceso al namespace de <strong>{deleteContext?.targetType}:{deleteContext?.targetId}</strong>.
              Esta acción no se puede deshacer.
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

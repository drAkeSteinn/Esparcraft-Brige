'use client';

import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, RefreshCw, Folder, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface Namespace {
  id: string;
  namespace: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  embedding_count?: number;
}

interface VerifyResult {
  totalEntities: number;
  verified: number;
  created: number;
  errors: number;
  details: Array<{
    entityType: string;
    entityId: string;
    entityName?: string;
    namespace: string;
    action: 'already_exists' | 'created' | 'error';
    error?: string;
  }>;
  orphanedNamespaces: Array<{
    namespace: string;
    entityType: string;
    entityId: string;
    embeddingsCount: number;
    deleted: boolean;
    error?: string;
  }>;
  orphanedCount: number;
  orphanedDeleted: number;
  orphanedErrors: number;
}

interface NamespacesByType {
  mundo: any[];
  pueblo: any[];
  edificio: any[];
  npc: any[];
  sesion: any[];
}

interface EmbeddingsNamespacesProps {
  onRefresh?: () => void;
}

export default function EmbeddingsNamespaces({ onRefresh }: EmbeddingsNamespacesProps) {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace | null>(null);
  const [formData, setFormData] = useState({
    namespace: '',
    description: ''
  });

  // Estado de verificación
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [namespacesByType, setNamespacesByType] = useState<NamespacesByType | null>(null);

  useEffect(() => {
    fetchNamespaces();
    fetchNamespacesByType();
  }, []);

  const fetchNamespaces = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/embeddings/namespaces');
      const data = await response.json();

      if (data.success) {
        setNamespaces(data.data.namespaces || []);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los namespaces',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.namespace.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del namespace es requerido',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/embeddings/namespaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Éxito',
          description: 'Namespace creado correctamente'
        });
        setCreateDialogOpen(false);
        setFormData({ namespace: '', description: '' });
        fetchNamespaces();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error || 'Error al crear namespace');
      }
    } catch (error: any) {
      console.error('Error creating namespace:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el namespace',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedNamespace) return;

    try {
      const response = await fetch(`/api/embeddings/namespaces/${selectedNamespace.namespace}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Éxito',
          description: 'Namespace eliminado correctamente'
        });
        setDeleteDialogOpen(false);
        setSelectedNamespace(null);
        fetchNamespaces();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error || 'Error al eliminar namespace');
      }
    } catch (error: any) {
      console.error('Error deleting namespace:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el namespace',
        variant: 'destructive'
      });
    }
  };

  // ============================================
  // VERIFICACIÓN DE NAMESPACES
  // ============================================

  const fetchNamespacesByType = async () => {
    try {
      const response = await fetch('/api/embeddings/verify-namespace');
      const data = await response.json();
      if (data.success) {
        setNamespacesByType(data.data.namespaces);
      }
    } catch (error) {
      console.error('Error fetching namespaces by type:', error);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await fetch('/api/embeddings/verify-namespace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.success) {
        const result = data.data as VerifyResult;
        setVerifyResult(result);
        const orphanMsg = result.orphanedCount > 0
          ? ` · ${result.orphanedCount} huérfanos detectados`
          : '';
        toast({
          title: result.errors > 0
            ? '⚠️ Verificación completada con errores'
            : result.orphanedCount > 0
              ? '⚠️ Verificación completada (con huérfanos)'
              : '✅ Verificación completada',
          description: `${result.totalEntities} entidades · ${result.created} creados · ${result.verified} existían · ${result.errors} errores${orphanMsg}`,
          variant: result.errors > 0 ? 'destructive' : 'default',
        });
        // Refrescar listas
        fetchNamespaces();
        fetchNamespacesByType();
        onRefresh?.();
      } else {
        throw new Error(data.error || 'Error al verificar');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo verificar',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Limpiar namespaces huérfanos
  const [cleaningOrphans, setCleaningOrphans] = useState(false);

  const handleCleanOrphans = async () => {
    if (!verifyResult || verifyResult.orphanedNamespaces.length === 0) return;

    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar ${verifyResult.orphanedNamespaces.length} namespace(s) huérfano(s)?\n\n` +
        `Los namespaces huérfanos son aquellos cuya entidad (sesión/NPC/edificio/pueblo/mundo) ya no existe en la base de datos.\n` +
        `Se eliminarán los embeddings asociados y el registro del namespace.\n\n` +
        `Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setCleaningOrphans(true);
    try {
      const response = await fetch('/api/embeddings/verify-namespace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanOrphans: true }),
      });
      const data = await response.json();
      if (data.success) {
        const result = data.data as VerifyResult;
        setVerifyResult(result);
        toast({
          title: result.orphanedErrors > 0 ? '⚠️ Limpieza completada con errores' : '✅ Limpieza completada',
          description: `${result.orphanedDeleted} namespace(s) huérfano(s) eliminados${result.orphanedErrors > 0 ? ` · ${result.orphanedErrors} errores` : ''}`,
          variant: result.orphanedErrors > 0 ? 'destructive' : 'default',
        });
        // Refrescar listas
        fetchNamespaces();
        fetchNamespacesByType();
        onRefresh?.();
      } else {
        throw new Error(data.error || 'Error al limpiar huérfanos');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron limpiar los huérfanos',
        variant: 'destructive',
      });
    } finally {
      setCleaningOrphans(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card de Verificación */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Verificación de Namespaces
            </span>
            <Button
              size="sm"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificar namespaces
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Verifica que cada mundo, pueblo, edificio, NPC y sesión tenga su propio namespace
            registrado. Si alguno falta, se crea automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Resumen por tipo */}
          {namespacesByType && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(['mundo', 'pueblo', 'edificio', 'npc', 'sesion'] as const).map((type) => {
                const count = namespacesByType[type]?.length || 0;
                const labels: Record<string, string> = {
                  mundo: 'Mundos', pueblo: 'Pueblos', edificio: 'Edificios', npc: 'NPCs', sesion: 'Sesiones',
                };
                return (
                  <div key={type} className="border rounded-md p-2 text-center bg-background/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{labels[type]}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resultado de la verificación */}
          {verifyResult && (
            <div className="space-y-2">
              <Alert variant={verifyResult.errors > 0 ? 'destructive' : 'default'}>
                {verifyResult.errors > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertDescription>
                  <strong>{verifyResult.totalEntities}</strong> entidades verificadas ·
                  {' '}<strong className="text-green-600">{verifyResult.created}</strong> namespaces creados ·
                  {' '}<strong>{verifyResult.verified}</strong> ya existían
                  {verifyResult.errors > 0 && (
                    <> · <strong className="text-red-600">{verifyResult.errors}</strong> errores</>
                  )}
                </AlertDescription>
              </Alert>

              {/* Detalles */}
              {verifyResult.details.length > 0 && (
                <ScrollArea className="max-h-60 rounded-md border p-2">
                  <div className="space-y-1">
                    {verifyResult.details.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {d.entityType}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                          {d.entityId.length > 20 ? d.entityId.substring(0, 20) + '...' : d.entityId}
                        </span>
                        {d.entityName && (
                          <span className="text-xs truncate flex-1">{d.entityName}</span>
                        )}
                        <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
                          {d.namespace}
                        </code>
                        {d.action === 'created' && (
                          <Badge variant="default" className="text-[9px] h-4 px-1 bg-green-600">+1</Badge>
                        )}
                        {d.action === 'already_exists' && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">✓</Badge>
                        )}
                        {d.action === 'error' && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">err</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Cada entidad tiene su propio namespace con la convención <code className="px-1 py-0.5 bg-muted rounded">{'{tipo}:{id}'}</code>
            (ej: <code className="px-1 py-0.5 bg-muted rounded">npc:NPC_123</code>, <code className="px-1 py-0.5 bg-muted rounded">sesion:SES_456</code>).
            Esto permite filtrar búsquedas por entidad específica.
          </p>

          {/* ============================================ */}
          {/* Namespaces huérfanos                          */}
          {/* ============================================ */}
          {verifyResult && verifyResult.orphanedCount > 0 && (
            <div className="space-y-2 p-3 border border-amber-500/40 rounded-md bg-amber-500/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Namespaces huérfanos: {verifyResult.orphanedCount}
                  </span>
                </div>
                {verifyResult.orphanedDeleted === 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleCleanOrphans}
                    disabled={cleaningOrphans}
                  >
                    {cleaningOrphans ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Limpiando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Limpiar huérfanos
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Estos namespaces existen en la base de datos pero su entidad (sesión/NPC/edificio/pueblo/mundo)
                ya no existe. Probablemente la entidad fue eliminada sin limpiar su namespace.
                {verifyResult.orphanedDeleted > 0 && (
                  <> · <strong className="text-green-600">{verifyResult.orphanedDeleted} eliminados</strong></>
                )}
                {verifyResult.orphanedErrors > 0 && (
                  <> · <strong className="text-red-600">{verifyResult.orphanedErrors} errores</strong></>
                )}
              </p>

              <ScrollArea className="max-h-40 rounded-md border p-2 bg-background/50">
                <div className="space-y-1">
                  {verifyResult.orphanedNamespaces.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {o.entityType}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                        {o.entityId.length > 20 ? o.entityId.substring(0, 20) + '...' : o.entityId}
                      </span>
                      <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
                        {o.namespace}
                      </code>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {o.embeddingsCount} emb
                      </span>
                      {o.deleted ? (
                        <Badge variant="default" className="text-[9px] h-4 px-1 bg-green-600">eliminado</Badge>
                      ) : o.error ? (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">err</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">huérfano</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Namespaces
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNamespaces}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setFormData({ namespace: '', description: '' });
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Namespace
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Organiza tus embeddings en colecciones separadas
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Namespaces Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando namespaces...</p>
          </div>
        </div>
      ) : namespaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No hay namespaces aún. Crea tu primera colección.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {namespaces.map((ns) => (
            <Card key={ns.id} className="hover:border-primary transition-colors">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {ns.namespace}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedNamespace(ns);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {ns.description && (
                  <CardDescription className="line-clamp-2">
                    {ns.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Embeddings</span>
                  <Badge variant="secondary">{ns.embedding_count || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Creado</span>
                  <span className="text-xs">
                    {new Date(ns.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {ns.updated_at !== ns.created_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actualizado</span>
                    <span className="text-xs">
                      {new Date(ns.updated_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Namespace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Namespace</DialogTitle>
            <DialogDescription>
              Crea una nueva colección para organizar tus embeddings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="namespace">Nombre del Namespace</Label>
              <Input
                id="namespace"
                placeholder="Ej: historia_2024"
                value={formData.namespace}
                onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usa un nombre corto y descriptivo
              </p>
            </div>
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Describe para qué se usará este namespace..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Crear Namespace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este namespace?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los embeddings dentro de este namespace. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold">{selectedNamespace?.namespace}</p>
            {selectedNamespace?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedNamespace.description}
              </p>
            )}
            <p className="text-sm text-destructive mt-2">
              {selectedNamespace?.embedding_count || 0} embeddings serán eliminados
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedNamespace(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar Namespace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

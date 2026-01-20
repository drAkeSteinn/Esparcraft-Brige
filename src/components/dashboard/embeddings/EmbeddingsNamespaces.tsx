'use client';

import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, RefreshCw, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

  useEffect(() => {
    fetchNamespaces();
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

  return (
    <div className="space-y-4">
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

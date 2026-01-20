'use client';

import { useEffect, useState } from 'react';
import { FileText, Trash2, RefreshCw, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Embedding {
  id: string;
  content: string;
  metadata: Record<string, any>;
  namespace: string;
  source_type?: string;
  source_id?: string;
  created_at: string;
}

interface EmbeddingsListProps {
  onRefresh?: () => void;
}

export default function EmbeddingsList({ onRefresh }: EmbeddingsListProps) {
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterSourceType, setFilterSourceType] = useState<string>('all');
  const [selectedEmbedding, setSelectedEmbedding] = useState<Embedding | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmbeddings();
  }, [filterNamespace, filterSourceType]);

  const fetchEmbeddings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterNamespace !== 'all') {
        params.append('namespace', filterNamespace);
      }
      if (filterSourceType !== 'all') {
        params.append('source_type', filterSourceType);
      }

      const response = await fetch(`/api/embeddings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEmbeddings(data.data.embeddings || []);
      }
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los embeddings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmbedding) return;

    try {
      const response = await fetch(`/api/embeddings/${selectedEmbedding.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Éxito',
          description: 'Embedding eliminado correctamente'
        });
        setDeleteDialogOpen(false);
        setSelectedEmbedding(null);
        fetchEmbeddings();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error || 'Error al eliminar embedding');
      }
    } catch (error: any) {
      console.error('Error deleting embedding:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el embedding',
        variant: 'destructive'
      });
    }
  };

  const filteredEmbeddings = embeddings.filter(embedding =>
    embedding.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (embedding.metadata?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Indexados
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEmbeddings}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Gestiona los documentos almacenados en el sistema de embeddings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en contenido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterNamespace} onValueChange={setFilterNamespace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los namespaces</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="worlds">Mundos</SelectItem>
                  <SelectItem value="npcs">NPCs</SelectItem>
                  <SelectItem value="sessions">Sesiones</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSourceType} onValueChange={setFilterSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="world">Mundo</SelectItem>
                  <SelectItem value="pueblo">Pueblo</SelectItem>
                  <SelectItem value="edificio">Edificio</SelectItem>
                  <SelectItem value="npc">NPC</SelectItem>
                  <SelectItem value="session">Sesión</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embeddings List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando embeddings...</p>
          </div>
        </div>
      ) : filteredEmbeddings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery || filterNamespace !== 'all' || filterSourceType !== 'all'
                ? 'No se encontraron embeddings con los filtros actuales'
                : 'No hay embeddings aún. Sube tu primer documento.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmbeddings.map((embedding) => (
            <Card key={embedding.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{embedding.namespace}</Badge>
                      {embedding.source_type && (
                        <Badge variant="secondary">{embedding.source_type}</Badge>
                      )}
                      {embedding.source_id && (
                        <Badge variant="outline" className="text-xs">
                          {embedding.source_id}
                        </Badge>
                      )}
                    </div>

                    {embedding.metadata?.title && (
                      <h3 className="font-semibold text-sm">
                        {embedding.metadata.title}
                      </h3>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {embedding.content}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(embedding.created_at).toLocaleString('es-ES')}
                      {embedding.metadata?.chunk_index !== undefined && (
                        <span className="ml-2">
                          • Chunk {embedding.metadata.chunk_index + 1}
                          {embedding.metadata.total_chunks > 1 && ` / ${embedding.metadata.total_chunks}`}
                        </span>
                      )}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmbedding(embedding);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este embedding?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema de embeddings.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">
              {selectedEmbedding?.metadata?.title || 'Sin título'}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedEmbedding?.content.substring(0, 200)}
              {(selectedEmbedding?.content.length || 0) > 200 && '...'}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedEmbedding(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

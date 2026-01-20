'use client';

import { useState, useEffect } from 'react';
import { Database, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import SearchPanel, { SearchParams } from './SearchPanel';
import SearchResults from './SearchResults';
import EmbeddingStats from './EmbeddingStats';
import DocumentCard from './DocumentCard';

export default function EmbeddingsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Forms
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    namespace: 'default',
    source_type: 'custom' as 'world' | 'pueblo' | 'edificio' | 'npc' | 'session' | 'custom',
    source_id: '',
    metadata: '{}'
  });

  // Available namespaces (from stats)
  const namespaces = stats?.by_namespace ? Object.keys(stats.by_namespace) : [];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/embeddings/stats');
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Error al cargar estadísticas');
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las estadísticas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (params: SearchParams) => {
    const endpoint = params.searchType === 'hybrid' ? '/api/search/hybrid' : '/api/search/vector';
    
    try {
      setSearching(true);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: params.query,
          namespace: params.namespace === 'all' ? undefined : params.namespace,
          limit: params.limit,
          threshold: params.threshold,
          source_type: params.source_type
        })
      });

      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data || []);
        toast({
          title: 'Búsqueda completada',
          description: `${result.data?.length || 0} resultados encontrados`
        });
        // Cambiar a la pestaña de resultados
        setActiveTab('results');
      } else {
        throw new Error(result.error || 'Error en la búsqueda');
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error en la búsqueda',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleCreateEmbedding = async () => {
    try {
      let metadata: Record<string, any> = {};
      try {
        metadata = JSON.parse(formData.metadata);
      } catch (e) {
        toast({
          title: 'Error',
          description: 'El metadata debe ser JSON válido',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('/api/embeddings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          namespace: formData.namespace,
          source_type: formData.source_type,
          source_id: formData.source_id || undefined,
          metadata
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Embedding creado correctamente'
        });
        setCreateDialogOpen(false);
        setFormData({
          content: '',
          namespace: formData.namespace,
          source_type: 'custom',
          source_id: '',
          metadata: '{}'
        });
        fetchStats();
      } else {
        throw new Error(result.error || 'Error al crear embedding');
      }
    } catch (error: any) {
      console.error('Error creating embedding:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el embedding',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Cargando sistema de embeddings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Embeddings</h2>
          <p className="text-muted-foreground">Sistema de búsqueda vectorial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                Nuevo Embedding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Embedding</DialogTitle>
                <DialogDescription>
                  Agrega un documento al sistema de búsqueda vectorial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Contenido *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Texto para generar el embedding..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="namespace">Namespace</Label>
                    <Input
                      id="namespace"
                      value={formData.namespace}
                      onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                      placeholder="default"
                    />
                  </div>
                  <div>
                    <Label htmlFor="source-type">Tipo</Label>
                    <Select
                      value={formData.source_type}
                      onValueChange={(value: any) => setFormData({ ...formData, source_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="world">Mundo</SelectItem>
                        <SelectItem value="pueblo">Pueblo</SelectItem>
                        <SelectItem value="edificio">Edificio</SelectItem>
                        <SelectItem value="npc">NPC</SelectItem>
                        <SelectItem value="session">Sesión</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="source-id">Source ID</Label>
                  <Input
                    id="source-id"
                    value={formData.source_id}
                    onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                    placeholder="ID del origen (opcional)"
                  />
                </div>
                <div>
                  <Label htmlFor="metadata">Metadata (JSON)</Label>
                  <Textarea
                    id="metadata"
                    value={formData.metadata}
                    onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                    placeholder='{"title": "Mi documento", "category": "general"}'
                    rows={2}
                  />
                </div>
                <Button onClick={handleCreateEmbedding} className="w-full">
                  Crear Embedding
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Estadísticas</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Búsqueda</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Resultados</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Crear</span>
          </TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <EmbeddingStats stats={stats} loading={loading} />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="space-y-4">
            <SearchPanel
              onSearch={handleSearch}
              loading={searching}
              namespaces={namespaces}
            />
            {searchResults.length > 0 && (
              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-3">Última búsqueda</h3>
                <SearchResults
                  results={searchResults}
                  loading={searching}
                  total={searchResults.length}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {searchResults.length > 0 ? (
            <SearchResults
              results={searchResults}
              loading={searching}
              total={searchResults.length}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay resultados para mostrar</p>
              <p className="text-sm mt-2">
                Realiza una búsqueda en la pestaña "Búsqueda"
              </p>
            </div>
          )}
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Usa el botón "Nuevo Embedding" en la parte superior para crear embeddings
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

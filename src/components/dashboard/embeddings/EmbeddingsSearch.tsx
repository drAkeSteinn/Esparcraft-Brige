'use client';

import { useState } from 'react';
import { Search, Sparkles, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  namespace: string;
  source_type?: string;
  source_id?: string;
  similarity: number;
}

export default function EmbeddingsSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState([0.7]);
  const [limit, setLimit] = useState('10');
  const [namespace, setNamespace] = useState<string>('all');
  const [sourceType, setSourceType] = useState<string>('all');

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa una consulta para buscar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        threshold: threshold[0].toString(),
        limit: limit.toString()
      });

      if (namespace !== 'all') {
        params.append('namespace', namespace);
      }

      if (sourceType !== 'all') {
        params.append('source_type', sourceType);
      }

      const response = await fetch(`/api/search/vector?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data.results || []);
        toast({
          title: 'Búsqueda completada',
          description: `${data.data.results.length} resultados encontrados`
        });
      } else {
        throw new Error(data.error || 'Error en la búsqueda');
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al realizar la búsqueda',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-50 dark:bg-green-950';
    if (similarity >= 0.8) return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
    return 'text-red-600 bg-red-50 dark:bg-red-950';
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'Contenido copiado al portapapeles'
      });
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Búsqueda Vectorial
          </CardTitle>
          <CardDescription>
            Encuentra documentos similares usando búsqueda semántica con embeddings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="query">Consulta</Label>
            <Textarea
              id="query"
              placeholder="Escribe tu consulta en lenguaje natural..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Presiona Cmd/Ctrl + Enter para buscar
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="threshold">Umbral de Similitud: {(threshold[0] * 100).toFixed(0)}%</Label>
              <Slider
                id="threshold"
                value={threshold}
                onValueChange={setThreshold}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Filtra resultados por similitud mínima
              </p>
            </div>

            <div>
              <Label htmlFor="limit">Resultados</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger id="limit" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 resultados</SelectItem>
                  <SelectItem value="10">10 resultados</SelectItem>
                  <SelectItem value="20">20 resultados</SelectItem>
                  <SelectItem value="50">50 resultados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="namespace">Namespace</Label>
              <Select value={namespace} onValueChange={setNamespace}>
                <SelectTrigger id="namespace" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="worlds">Mundos</SelectItem>
                  <SelectItem value="npcs">NPCs</SelectItem>
                  <SelectItem value="sessions">Sesiones</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="sourceType">Tipo de Fuente (opcional)</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger id="sourceType" className="mt-2">
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

          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Search className="h-4 w-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar Documentos Similares
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultados de Búsqueda</span>
              <Badge variant="outline">{results.length} encontrados</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      {/* Metadata and badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{result.namespace}</Badge>
                        {result.source_type && (
                          <Badge variant="secondary">{result.source_type}</Badge>
                        )}
                        {result.source_id && (
                          <Badge variant="outline" className="text-xs">
                            {result.source_id}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      {result.metadata?.title && (
                        <h3 className="font-semibold">
                          {result.metadata.title}
                        </h3>
                      )}

                      {/* Similarity Score */}
                      <div className="flex items-center gap-2">
                        <Badge className={`px-2 py-1 ${getSimilarityColor(result.similarity)}`}>
                          {result.metadata?.chunk_index !== undefined && `Chunk ${result.metadata.chunk_index + 1} • `}
                          {(result.similarity * 100).toFixed(1)}% similar
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          #{index + 1} resultado
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-muted-foreground">
                        {result.content}
                      </p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(result.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!loading && query && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No se encontraron resultados con la configuración actual
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Intenta reducir el umbral de similitud o buscar en otro namespace
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

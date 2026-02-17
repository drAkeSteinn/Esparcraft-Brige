'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, Eye, Settings2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  previewChunks,
  SPLITTER_INFO,
  type SplitterType,
  type SplitterPreview,
  type ChunkResult,
} from '@/lib/text-splitters';

interface EmbeddingItem {
  content: string;
  metadata?: Record<string, any>;
  source_type?: string;
  source_id?: string;
}

interface EmbeddingsUploadProps {
  onUploadComplete?: () => void;
}

interface NamespaceInfo {
  namespace: string;
  description?: string;
  embedding_count?: number;
}

export default function EmbeddingsUpload({ onUploadComplete }: EmbeddingsUploadProps) {
  const [content, setContent] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [sourceType, setSourceType] = useState<string>('custom');
  const [sourceId, setSourceId] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [loadingNamespaces, setLoadingNamespaces] = useState(true);

  // Splitter configuration
  const [splitterType, setSplitterType] = useState<SplitterType>('recursive');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<SplitterPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load namespaces dynamically
  useEffect(() => {
    fetchNamespaces();
  }, []);

  const fetchNamespaces = async () => {
    setLoadingNamespaces(true);
    try {
      const response = await fetch('/api/embeddings/namespaces');
      const data = await response.json();
      if (data.success) {
        setNamespaces(data.data.namespaces || []);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    } finally {
      setLoadingNamespaces(false);
    }
  };

  // System namespaces
  const systemNamespaces = [
    { namespace: 'default', description: 'Namespace por defecto' },
    { namespace: 'worlds', description: 'Información de mundos' },
    { namespace: 'npcs', description: 'Información de NPCs' },
    { namespace: 'pueblos', description: 'Información de pueblos' },
    { namespace: 'edificios', description: 'Información de edificios' },
    { namespace: 'sessions', description: 'Historial de sesiones' },
  ];

  const allNamespaces = [
    ...systemNamespaces,
    ...namespaces.filter(ns => 
      !systemNamespaces.some(sys => sys.namespace === ns.namespace)
    )
  ];

  // Generate preview
  const handlePreview = () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'El contenido no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    setLoadingPreview(true);
    
    // Small delay for UX
    setTimeout(() => {
      const preview = previewChunks(content, splitterType, { chunkSize, chunkOverlap });
      setPreviewData(preview);
      setPreviewOpen(true);
      setLoadingPreview(false);
    }, 100);
  };

  const handleUpload = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'El contenido no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setUploading(true);
    setProgress(0);

    try {
      // Use selected splitter
      const preview = previewChunks(content, splitterType, { chunkSize, chunkOverlap });
      const chunks = preview.chunks;

      if (chunks.length === 0) {
        throw new Error('No se generaron chunks del contenido');
      }

      const items: EmbeddingItem[] = chunks.map((chunk, index) => ({
        content: chunk.text,
        metadata: {
          title: title || `Documento ${new Date().toISOString()}`,
          chunk_index: index,
          total_chunks: chunks.length,
          splitter_type: splitterType,
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
        },
        source_type: sourceType,
        source_id: sourceId || undefined
      }));

      setProgress(20);

      const response = await fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          namespace
        })
      });

      setProgress(80);

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Éxito',
          description: `${data.data.count} embeddings creados exitosamente`
        });

        // Clear form
        setContent('');
        setTitle('');
        setSourceId('');
        setSourceType('custom');
        setNamespace('default');

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        throw new Error(data.error || 'Error al crear embeddings');
      }

      setProgress(100);
    } catch (error: any) {
      console.error('Error uploading embeddings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al crear embeddings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento
          </CardTitle>
          <CardDescription>
            Agrega contenido al sistema de embeddings para búsqueda semántica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic fields */}
          <div>
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Ej: Historia del Reino del Norte"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Nombre descriptivo para identificar el documento
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="namespace">Namespace</Label>
              <Select value={namespace} onValueChange={setNamespace}>
                <SelectTrigger id="namespace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loadingNamespaces ? (
                    <SelectItem value="default" disabled>Cargando namespaces...</SelectItem>
                  ) : (
                    allNamespaces.map((ns) => (
                      <SelectItem key={ns.namespace} value={ns.namespace}>
                        {ns.namespace} {ns.embedding_count !== undefined ? `(${ns.embedding_count})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Colección donde se almacenará el embedding
              </p>
            </div>

            <div>
              <Label htmlFor="sourceType">Tipo de Fuente</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="sourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  <SelectItem value="world">Mundo</SelectItem>
                  <SelectItem value="pueblo">Pueblo</SelectItem>
                  <SelectItem value="edificio">Edificio</SelectItem>
                  <SelectItem value="npc">NPC</SelectItem>
                  <SelectItem value="session">Sesión</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Categoría del recurso (permite filtrar búsquedas)
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="sourceId">ID de Fuente (opcional)</Label>
            <Input
              id="sourceId"
              placeholder="Ej: WORLD_ESPARCRAFT, NPC_123456"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Permite vincular el embedding a una entidad específica (mundo, NPC, etc.)
            </p>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Contenido *</Label>
            <Textarea
              id="content"
              placeholder="Escribe o pega el texto que deseas indexar para búsqueda semántica..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{content.length} caracteres</span>
              <span>
                ~{Math.ceil(content.length / chunkSize)} chunks estimados
              </span>
            </div>
          </div>

          {/* Splitter Configuration */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="splitter-config">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configuración de División (Text Splitter)
                  <Badge variant="secondary" className="ml-2">
                    {SPLITTER_INFO[splitterType].name}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label>Tipo de Splitter</Label>
                  <Select value={splitterType} onValueChange={(v) => setSplitterType(v as SplitterType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SPLITTER_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{info.name}</span>
                            {info.recommended && (
                              <Badge variant="outline" className="text-xs">Recomendado</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {SPLITTER_INFO[splitterType].description}
                  </p>
                  {SPLITTER_INFO[splitterType].bestFor.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground">Ideal para:</span>
                      {SPLITTER_INFO[splitterType].bestFor.map((use, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Tamaño de Chunk: {chunkSize} caracteres</Label>
                    <Slider
                      value={[chunkSize]}
                      onValueChange={(v) => setChunkSize(v[0])}
                      min={200}
                      max={4000}
                      step={100}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tamaño máximo de cada fragmento de texto
                    </p>
                  </div>

                  <div>
                    <Label>Overlap: {chunkOverlap} caracteres</Label>
                    <Slider
                      value={[chunkOverlap]}
                      onValueChange={(v) => setChunkOverlap(v[0])}
                      min={0}
                      max={500}
                      step={50}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Caracteres compartidos entre chunks adyacentes
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Procesando...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loadingPreview || !content.trim()}
              className="flex-1"
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Chunks
            </Button>
            
            <Button
              onClick={handleUpload}
              disabled={loading || !content.trim()}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Crear Embeddings
                </>
              )}
            </Button>
          </div>

          {/* Help info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex gap-2 items-start">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Usa <strong>Preview Chunks</strong> para ver cómo se dividirá tu texto antes de crear embeddings</p>
                <p>• Los embeddings se generarán usando el modelo configurado en Ollama</p>
                <p>• El <strong>overlap</strong> ayuda a mantener contexto entre chunks adyacentes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview de Chunks</DialogTitle>
            <DialogDescription>
              Revisa cómo se dividirá tu contenido antes de crear los embeddings
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{previewData.totalChunks}</div>
                  <div className="text-xs text-muted-foreground">Total Chunks</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{previewData.avgChunkSize}</div>
                  <div className="text-xs text-muted-foreground">Promedio</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{previewData.minChunkSize}</div>
                  <div className="text-xs text-muted-foreground">Mínimo</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{previewData.maxChunkSize}</div>
                  <div className="text-xs text-muted-foreground">Máximo</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {previewData.warnings.length === 0 ? (
                      <CheckCircle className="h-6 w-6 mx-auto text-green-500" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mx-auto text-yellow-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Estado</div>
                </div>
              </div>

              {/* Warnings */}
              {previewData.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      {previewData.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chunks list */}
              <div className="flex-1 overflow-y-auto space-y-3">
                <Label>Chunks generados:</Label>
                {previewData.chunks.map((chunk, index) => (
                  <ChunkPreviewCard key={index} chunk={chunk} />
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  setPreviewOpen(false);
                  handleUpload();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Crear {previewData.totalChunks} Embeddings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Chunk preview card component
function ChunkPreviewCard({ chunk }: { chunk: ChunkResult }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = chunk.text.length > 200;

  return (
    <div className="bg-muted rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary">Chunk {chunk.index + 1}</Badge>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{chunk.text.length} chars</span>
          {chunk.metadata?.tokens && <span>~{chunk.metadata.tokens} tokens</span>}
        </div>
      </div>
      <p className={`text-sm ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {chunk.text}
      </p>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Mostrar menos' : 'Mostrar más'}
        </Button>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface EmbeddingItem {
  content: string;
  metadata?: Record<string, any>;
  source_type?: string;
  source_id?: string;
}

interface EmbeddingsUploadProps {
  onUploadComplete?: () => void;
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
      // Dividir el contenido en chunks si es muy largo
      const chunks = splitIntoChunks(content, 1000);
      const totalChunks = chunks.length;

      const items: EmbeddingItem[] = chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          title: title || `Documento ${new Date().toISOString()}`,
          chunk_index: index,
          total_chunks: totalChunks
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

        // Limpiar formulario
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

  const splitIntoChunks = (text: string, maxChars: number): string[] => {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);

    let currentChunk = '';
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if ((currentChunk + trimmedSentence).length <= maxChars) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  return (
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
        <div>
          <Label htmlFor="title">Título (opcional)</Label>
          <Input
            id="title"
            placeholder="Ej: Historia del Reino del Norte"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="namespace">Namespace</Label>
            <Select value={namespace} onValueChange={setNamespace}>
              <SelectTrigger id="namespace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="worlds">Mundos</SelectItem>
                <SelectItem value="npcs">NPCs</SelectItem>
                <SelectItem value="sessions">Sesiones</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
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
          </div>
        </div>

        <div>
          <Label htmlFor="sourceId">ID de Fuente (opcional)</Label>
          <Input
            id="sourceId"
            placeholder="Ej: WORLD_ESPARCRAFT"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            ID del recurso relacionado (world_id, npc_id, etc.)
          </p>
        </div>

        <div>
          <Label htmlFor="content">Contenido</Label>
          <Textarea
            id="content"
            placeholder="Escribe o pega el texto que deseas indexar..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{content.length} caracteres</span>
            <span>
              {Math.ceil(content.length / 1000)} chunks estimados
            </span>
          </div>
        </div>

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

        <Button
          onClick={handleUpload}
          disabled={loading || !content.trim()}
          className="w-full"
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

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex gap-2 items-start">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• El contenido se dividirá automáticamente en chunks de ~1000 caracteres</p>
              <p>• Los embeddings se generarán usando el modelo configurado</p>
              <p>• Usa namespaces para organizar tus documentos por temas</p>
              <p>• Los tipos de fuente permiten vincular embeddings a recursos del sistema</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

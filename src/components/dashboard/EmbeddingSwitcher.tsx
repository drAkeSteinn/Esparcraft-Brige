'use client';

import { useState, useEffect } from 'react';
import { Brain, Settings2, ChevronDown, ChevronUp, Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

export interface EmbeddingConfig {
  enabled: boolean;
  namespace: string;
  maxResults: number;
  threshold: number;
  includeRelated: boolean;
  relatedNamespaces: string[];
}

interface EmbeddingResult {
  id: string;
  content: string;
  similarity: number;
  namespace: string;
  source_type?: string;
  source_id?: string;
  metadata?: Record<string, any>;
}

interface EmbeddingSwitcherProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  namespace: string;
  config?: Partial<EmbeddingConfig>;
  onConfigChange?: (config: EmbeddingConfig) => void;
  previewQuery?: string;
  showPreview?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  enabled: false,
  namespace: 'default',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: false,
  relatedNamespaces: []
};

export default function EmbeddingSwitcher({
  enabled,
  onToggle,
  namespace,
  config: initialConfig,
  onConfigChange,
  previewQuery,
  showPreview = true,
  disabled = false,
  label = 'Usar Embeddings',
  description = 'Buscar información relevante en la base de datos vectorial'
}: EmbeddingSwitcherProps) {
  const [config, setConfig] = useState<EmbeddingConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    namespace
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<EmbeddingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Actualizar namespace cuando cambie
  useEffect(() => {
    setConfig(prev => ({ ...prev, namespace }));
  }, [namespace]);

  // Buscar embeddings cuando cambia el query
  useEffect(() => {
    if (!enabled || !showPreview || !previewQuery || previewQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    const searchEmbeddings = async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch('/api/search/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: previewQuery,
            namespace: config.namespace,
            limit: config.maxResults,
            threshold: config.threshold
          })
        });

        const data = await response.json();

        if (data.success && data.data?.results) {
          setResults(data.data.results);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error('Error searching embeddings:', err);
        setError(err.message || 'Error al buscar embeddings');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchEmbeddings, 500);
    return () => clearTimeout(timeoutId);
  }, [enabled, previewQuery, config.namespace, config.maxResults, config.threshold, showPreview]);

  const handleConfigChange = (updates: Partial<EmbeddingConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.9) return 'bg-green-500';
    if (similarity >= 0.8) return 'bg-green-400';
    if (similarity >= 0.7) return 'bg-yellow-400';
    if (similarity >= 0.6) return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      {/* Header con Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${enabled ? 'bg-primary/20' : 'bg-muted'}`}>
            <Brain className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{label}</Label>
              {enabled && (
                <Badge variant="outline" className="text-xs">
                  {namespace}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && results.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {results.length} resultados
            </Badge>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Configuración expandible */}
      {enabled && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <Settings2 className="h-3 w-3 mr-2" />
              Configuración
              {isOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2 pt-3 border-t">
            {/* Max Results */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Resultados máximos: {config.maxResults}</Label>
              </div>
              <Slider
                value={[config.maxResults]}
                onValueChange={([value]) => handleConfigChange({ maxResults: value })}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Umbral de similitud: {config.threshold.toFixed(2)}</Label>
              </div>
              <Slider
                value={[config.threshold * 100]}
                onValueChange={([value]) => handleConfigChange({ threshold: value / 100 })}
                min={50}
                max={95}
                step={5}
                className="w-full"
              />
            </div>

            {/* Include Related */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Incluir relacionados</Label>
                <p className="text-xs text-muted-foreground">Buscar en namespaces relacionados</p>
              </div>
              <Switch
                checked={config.includeRelated}
                onCheckedChange={(checked) => handleConfigChange({ includeRelated: checked })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Preview de resultados */}
      {enabled && showPreview && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Label className="text-xs font-medium">Resultados encontrados</Label>
            {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          {!isSearching && results.length === 0 && !error && (
            <div className="text-xs text-muted-foreground text-center py-2">
              {previewQuery && previewQuery.trim().length >= 3
                ? 'No se encontraron resultados relevantes'
                : 'Escribe al menos 3 caracteres para buscar'}
            </div>
          )}

          {results.length > 0 && (
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div
                    key={result.id || index}
                    className="p-2 bg-background rounded border text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {result.namespace}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getSimilarityColor(result.similarity)}`} />
                        <span className="text-muted-foreground">
                          {(result.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">
                      {result.content.substring(0, 100)}
                      {result.content.length > 100 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

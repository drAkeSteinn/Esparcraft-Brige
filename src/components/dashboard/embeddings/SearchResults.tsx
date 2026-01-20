'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Copy, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import DocumentCard, { DocumentCardProps } from './DocumentCard';

interface SearchResult {
  id: string;
  content: string;
  namespace: string;
  source_type?: string;
  source_id?: string;
  metadata: any;
  score: number;
  distance?: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query?: string;
  total?: number;
}

export function SearchResults({ results, loading, query, total }: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'El contenido se ha copiado al portapapeles'
      });
    } catch (error) {
      console.error('Error al copiar:', error);
      toast({
        title: 'Error',
        description: 'No se pudo copiar el contenido',
        variant: 'destructive'
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Muy similar';
    if (score >= 0.7) return 'Similar';
    if (score >= 0.5) return 'Moderadamente similar';
    return 'Poco similar';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Buscando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0 && query) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground font-medium">No se encontraron resultados</p>
              <p className="text-sm text-muted-foreground mt-2">
                Intenta con otra consulta o ajusta los filtros
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0 && !query) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground font-medium">Listo para buscar</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ingresa una consulta para buscar en los embeddings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resultados</h3>
          <p className="text-sm text-muted-foreground">
            {results.length} {total !== undefined && `de ${total}`} documentos encontrados
          </p>
        </div>
        {query && (
          <Badge variant="outline" className="text-xs">
            "{query.slice(0, 30)}{query.length > 30 ? '...' : ''}"
          </Badge>
        )}
      </div>

      {/* Results List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-4">
          {results.map((result, index) => {
            const isExpanded = expandedResults.has(result.id);

            return (
              <Card key={result.id} className="border-2 hover:border-primary/50 transition-all">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(result.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-3">
                      <div className="flex items-start gap-4">
                        {/* Ranking */}
                        <div className="flex-shrink-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground"
                          >
                            {index + 1}
                          </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Title */}
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="text-base line-clamp-1 flex-1">
                              {result.metadata?.title || result.content.slice(0, 80)}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={getScoreColor(result.score)}>
                                {Math.round(result.score * 100)}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {getScoreLabel(result.score)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="capitalize">{result.source_type}</span>
                            {result.source_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{result.source_id}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{result.namespace}</span>
                            {result.metadata?.category && (
                              <>
                                <span>•</span>
                                <span className="text-primary">{result.metadata.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-3">
                      {/* Full Content */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {result.content}
                        </p>
                      </div>

                      {/* Metadata Details */}
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Metadata:</p>
                          <ScrollArea className="h-32">
                            <div className="text-xs font-mono space-y-1">
                              {Object.entries(result.metadata).map(([key, value], i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="flex-1 overflow-hidden text-ellipsis">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(result.content)}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar contenido
                        </Button>
                        {result.metadata?.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(result.metadata.url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver fuente
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default SearchResults;

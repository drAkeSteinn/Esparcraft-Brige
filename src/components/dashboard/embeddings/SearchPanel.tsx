'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  namespaces: string[];
}

export interface SearchParams {
  query: string;
  namespace?: string;
  searchType: 'vector' | 'hybrid';
  limit: number;
  threshold: number;
  source_type?: string;
  useHybrid?: boolean;
  hybridWeight?: number; // 0 = solo vector, 1 = solo texto
}

export function SearchPanel({ onSearch, loading, namespaces }: SearchPanelProps) {
  const [params, setParams] = useState<SearchParams>({
    query: '',
    namespace: 'all',
    searchType: 'vector',
    limit: 10,
    threshold: 0.6,
    useHybrid: false,
    hybridWeight: 0.5
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleSearch = () => {
    if (!params.query.trim()) return;
    onSearch(params);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setParams({
      query: '',
      namespace: 'all',
      searchType: 'vector',
      limit: 10,
      threshold: 0.6,
      useHybrid: false,
      hybridWeight: 0.5
    });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={params.query}
              onChange={(e) => setParams({ ...params, query: e.target.value })}
              onKeyDown={handleKeyPress}
              placeholder="Busca documentos por contenido semántico..."
              className="pl-10 pr-10"
            />
            {params.query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={loading || !params.query.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Basic Filters */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="namespace" className="text-xs text-muted-foreground mb-1 block">
              Namespace
            </Label>
            <Select
              value={params.namespace}
              onValueChange={(value) => setParams({ ...params, namespace: value })}
            >
              <SelectTrigger id="namespace">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los namespaces</SelectItem>
                {namespaces.map((ns) => (
                  <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-[140px]">
            <Label htmlFor="search-type" className="text-xs text-muted-foreground mb-1 block">
              Tipo
            </Label>
            <Select
              value={params.searchType}
              onValueChange={(value: 'vector' | 'hybrid') => setParams({ ...params, searchType: value })}
            >
              <SelectTrigger id="search-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vector">Vectorial</SelectItem>
                <SelectItem value="hybrid">Híbrida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[100px]">
            <Label htmlFor="limit" className="text-xs text-muted-foreground mb-1 block">
              Resultados
            </Label>
            <Select
              value={params.limit.toString()}
              onValueChange={(value) => setParams({ ...params, limit: parseInt(value) })}
            >
              <SelectTrigger id="limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Options */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Opciones avanzadas
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-3">
              {/* Source Type Filter */}
              <div>
                <Label htmlFor="source-type" className="text-sm">
                  Tipo de documento
                </Label>
                <Select
                  value={params.source_type || 'all'}
                  onValueChange={(value) => setParams({ ...params, source_type: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger id="source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="world">Mundos</SelectItem>
                    <SelectItem value="pueblo">Pueblos</SelectItem>
                    <SelectItem value="edificio">Edificios</SelectItem>
                    <SelectItem value="npc">NPCs</SelectItem>
                    <SelectItem value="session">Sesiones</SelectItem>
                    <SelectItem value="custom">Personalizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Threshold Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="threshold" className="text-sm">
                    Umbral de similitud
                  </Label>
                  <Badge variant="outline">{Math.round(params.threshold * 100)}%</Badge>
                </div>
                <Slider
                  id="threshold"
                  value={[params.threshold]}
                  onValueChange={([value]) => setParams({ ...params, threshold: value })}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% (permissivo)</span>
                  <span>50% (moderado)</span>
                  <span>100% (estricto)</span>
                </div>
              </div>

              {/* Hybrid Weight (solo para búsqueda híbrida) */}
              {params.searchType === 'hybrid' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hybrid-weight" className="text-sm">
                      Peso vectorial vs. texto
                    </Label>
                    <Badge variant="outline">
                      {Math.round(params.hybridWeight! * 100)}% vectorial
                    </Badge>
                  </div>
                  <Slider
                    id="hybrid-weight"
                    value={[params.hybridWeight!]}
                    onValueChange={([value]) => setParams({ ...params, hybridWeight: value })}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Solo texto</span>
                    <span>Balanceado</span>
                    <span>Solo vector</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Search Type Badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={params.searchType === 'vector' ? 'default' : 'secondary'}>
            {params.searchType === 'vector' ? 'Vectorial' : 'Híbrida'}
          </Badge>
          {params.namespace !== 'all' && (
            <span>• {params.namespace}</span>
          )}
          {params.source_type && (
            <span>• {params.source_type}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchPanel;

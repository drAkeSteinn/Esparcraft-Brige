'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, FileText, Clock, TrendingUp } from 'lucide-react';

interface EmbeddingStatsProps {
  stats: {
    total_embeddings?: number;
    total_namespaces?: number;
    embedding_dimension?: number;
    model_name?: string;
    db_connected?: boolean;
    textgen_connected?: boolean;
    by_source_type?: Record<string, number>;
    by_namespace?: Record<string, number>;
    recent_activity?: Array<{
      date: string;
      count: number;
    }>;
  };
  loading?: boolean;
}

export function EmbeddingStats({ stats, loading }: EmbeddingStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getPercentile = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.round((value / max) * 100);
  };

  const maxBySource = Math.max(...Object.values(stats.by_source_type || {}).map(Number), 1);
  const maxByNamespace = Math.max(...Object.values(stats.by_namespace || {}).map(Number), 1);

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Embeddings</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_embeddings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documentos indexados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Namespaces</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_namespaces || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Colecciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dimensión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.embedding_dimension || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.model_name || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={stats.db_connected ? 'default' : 'destructive'}>
                PostgreSQL: {stats.db_connected ? '✓' : '✗'}
              </Badge>
              <Badge variant={stats.textgen_connected ? 'default' : 'destructive'}>
                TextGen: {stats.textgen_connected ? '✓' : '✗'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Type Distribution */}
      {stats.by_source_type && Object.keys(stats.by_source_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>
              Cantidad de embeddings por tipo de documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.by_source_type).map(([type, count]) => {
              const countNum = Number(count);
              const percentile = getPercentile(countNum, maxBySource);
              
              return (
                <div key={type} key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{type}</span>
                      <span className="text-sm text-muted-foreground">{countNum} embeddings</span>
                    </div>
                    <span className="text-sm font-medium">{percentile}%</span>
                  </div>
                  <Progress value={percentile} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Namespace Distribution */}
      {stats.by_namespace && Object.keys(stats.by_namespace).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Namespaces</CardTitle>
            <CardDescription>
              Namespaces con más embeddings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_namespace)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .slice(0, 5)
                .map(([namespace, count], index) => {
                  const countNum = Number(count);
                  const percentile = getPercentile(countNum, maxByNamespace);
                  
                  return (
                    <div key={namespace} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{namespace}</span>
                          <span className="text-sm text-muted-foreground">{countNum}</span>
                        </div>
                        <Progress value={percentile} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Summary */}
      {(stats.total_embeddings || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              Métricas clave del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {stats.total_embeddings || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total embeddings
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold">
                  {(stats.embedding_dimension || 0) * (stats.total_embeddings || 0)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Dimensiones totales
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold">
                  {Object.keys(stats.by_namespace || {}).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Namespaces
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EmbeddingStats;

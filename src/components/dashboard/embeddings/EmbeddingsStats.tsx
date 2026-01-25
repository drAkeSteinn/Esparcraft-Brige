'use client';

import { useEffect, useState } from 'react';
import { Database, FileText, Layers, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmbeddingStats {
  totalEmbeddings: number;
  totalNamespaces: number;
  embeddingsByNamespace: Record<string, number>;
  embeddingsBySourceType: Record<string, number>;
}

interface ConnectionStatus {
  provider?: 'textgen' | 'ollama';
  db: boolean;
  textGen: boolean;
  ollama: boolean;
}

export default function EmbeddingsStats() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchConnections();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/embeddings/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/embeddings/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Connection Status */}
      {(connections && (
        <Card className="mb-4 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 md:gap-8">
              <div className="flex items-center gap-2">
                {connections.db ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">PostgreSQL</span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const isOllama = connections.provider === 'ollama';
                  const status = isOllama ? connections.ollama : connections.textGen;

                  return status ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  );
                })()}
                <span className="text-sm font-medium">
                  {connections.provider === 'ollama' ? 'Ollama' : 'Text Generation WebUI'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Embeddings
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalEmbeddings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Documentos indexados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Namespaces
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalNamespaces || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Colecciones organizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Principal Namespace
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.embeddingsByNamespace?.default || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              En namespace por defecto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fuente Principal
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(stats?.embeddingsBySourceType || {}).reduce((a, b) => Math.max(a, b), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Mayor cantidad por tipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Source Type Distribution */}
      {stats && Object.keys(stats.embeddingsBySourceType || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo de Fuente</CardTitle>
            <CardDescription>
              Cantidad de embeddings por tipo de recurso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.embeddingsBySourceType || {}).map(([type, count]) => {
                const percentage = stats.totalEmbeddings > 0
                  ? ((count / stats.totalEmbeddings) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{type}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Namespace Distribution */}
      {stats && Object.keys(stats.embeddingsByNamespace || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Namespace</CardTitle>
            <CardDescription>
              Cantidad de embeddings por colección
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(stats.embeddingsByNamespace || {}).map(([namespace, count]) => (
                <div key={namespace} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{namespace}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{count} docs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

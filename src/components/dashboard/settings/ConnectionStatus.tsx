'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Database, Brain, Server, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConnectionStatus {
  postgres?: boolean;
  embeddings?: {
    provider?: 'textgen' | 'ollama';
    db: boolean;
    textGen: boolean;
    ollama: boolean;
  };
  llm?: boolean;
}

export default function ConnectionStatus() {
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkConnections = async () => {
    setLoading(true);
    try {
      // Verificar PostgreSQL embeddings
      const embeddingsRes = await fetch('/api/embeddings/connections');
      const embeddingsData = await embeddingsRes.json();

      // Verificar LLM (usando reroute health check)
      const llmRes = await fetch('/api/reroute');
      const llmData = await llmRes.json();

      setConnections({
        embeddings: embeddingsData.success ? embeddingsData.data : undefined,
        llm: llmData.status === 'ok'
      });

      setLastChecked(new Date().toLocaleString('es-ES'));
    } catch (error) {
      console.error('Error checking connections:', error);
      setConnections({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnections();

    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    if (status) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="outline">Desconocido</Badge>;
    if (status) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Conectado</Badge>;
    return <Badge variant="destructive">Desconectado</Badge>;
  };

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Estado de Conexiones</h3>
          <div className="flex items-center gap-4">
            {connections?.embeddings?.provider && (
              <Badge variant="outline">
                Embeddings: {connections.embeddings.provider === 'ollama' ? 'Ollama' : 'Text Gen WebUI'}
              </Badge>
            )}
            {lastChecked && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Actualizado: {lastChecked}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnections}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* PostgreSQL Embeddings */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 mt-1">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                getStatusIcon(connections?.embeddings?.db)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">PostgreSQL</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Base de datos de embeddings
              </p>
              {getStatusBadge(connections?.embeddings?.db)}
            </div>
          </div>

          {/* Text Generation WebUI / Ollama */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 mt-1">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                getStatusIcon(connections?.embeddings?.provider === 'ollama'
                  ? connections?.embeddings?.ollama
                  : connections?.embeddings?.textGen)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {connections?.embeddings?.provider === 'ollama' ? 'Ollama' : 'Text Gen WebUI'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {connections?.embeddings?.provider === 'ollama'
                  ? 'API de embeddings Ollama'
                  : 'API de embeddings'}
              </p>
              {getStatusBadge(connections?.embeddings?.provider === 'ollama'
                ? connections?.embeddings?.ollama
                : connections?.embeddings?.textGen)}
            </div>
          </div>

          {/* LLM API */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 mt-1">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                getStatusIcon(connections?.llm)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">LLM API</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                API de generación de texto
              </p>
              {getStatusBadge(connections?.llm)}
            </div>
          </div>
        </div>

        {/* All services OK */}
        {connections && !loading && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {(() => {
                const provider = connections.embeddings?.provider || 'textgen';
                const embeddingProvider = provider === 'ollama' ? connections.embeddings?.ollama : connections.embeddings?.textGen;
                const db = connections.embeddings?.db;
                const llm = connections.llm;

                if (db && embeddingProvider && llm) {
                  return 'Todos los servicios están conectados y funcionando correctamente';
                } else {
                  return 'Algunos servicios no están disponibles. Revisa la configuración.';
                }
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

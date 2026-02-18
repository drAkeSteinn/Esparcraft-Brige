'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ListOrdered, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Trash2, 
  RefreshCw,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QueueItem {
  id: string;
  npcId: string;
  playerSessionId?: string;
  message: string;
  addedAt: string;
  retryCount: number;
}

interface QueueStats {
  totalProcessed: number;
  totalFailed: number;
  currentQueueSize: number;
  isProcessing: boolean;
  currentItemId?: string;
  averageProcessingTime?: number;
}

interface QueueStatus {
  stats: QueueStats;
  pendingCount: number;
  totalItems: number;
  pendingItems: QueueItem[];
  recentCompleted: Array<{
    id: string;
    npcId: string;
    completedAt: string;
    processingTimeMs?: number;
  }>;
  recentFailed: Array<{
    id: string;
    npcId: string;
    error?: string;
    completedAt: string;
  }>;
}

export default function QueueTab() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/queue/status');
      const result = await response.json();
      if (result.success) {
        setQueueStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    // Actualizar cada 2 segundos
    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCompleted = async () => {
    try {
      setClearing(true);
      const response = await fetch('/api/queue/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'completed' })
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Cola limpiada',
          description: result.message
        });
        fetchQueueStatus();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo limpiar la cola',
        variant: 'destructive'
      });
    } finally {
      setClearing(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro? Esto cancelará todos los requests pendientes.')) return;
    
    try {
      setClearing(true);
      const response = await fetch('/api/queue/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' })
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Cola vaciada',
          description: 'Todos los requests han sido eliminados'
        });
        fetchQueueStatus();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo vaciar la cola',
        variant: 'destructive'
      });
    } finally {
      setClearing(false);
    }
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = queueStatus?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cola de Chat</h2>
          <p className="text-muted-foreground">
            Monitoreo de requests de chat en proceso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchQueueStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearCompleted} disabled={clearing}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar completados
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={clearing}>
            Vaciar cola
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Cola</CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.pendingCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requests pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            {stats?.isProcessing ? (
              <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats?.isProcessing ? (
                <>
                  <Badge variant="default" className="bg-yellow-500">Procesando</Badge>
                </>
              ) : (
                <Badge variant="default" className="bg-green-600">Inactivo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.currentItemId ? `ID: ${stats.currentItemId.substring(0, 20)}...` : 'Sin proceso activo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProcessed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(stats?.averageProcessingTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por request
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pendientes ({queueStatus?.pendingItems?.length || 0})
            </CardTitle>
            <CardDescription>
              Requests esperando ser procesados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {queueStatus?.pendingItems?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay requests pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {queueStatus?.pendingItems?.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.id.substring(0, 15)}...
                          </span>
                        </div>
                        {item.retryCount > 0 && (
                          <Badge variant="secondary">
                            Reintento #{item.retryCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        <p><strong>NPC:</strong> {item.npcId}</p>
                        <p><strong>Mensaje:</strong> {item.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Agregado: {formatDate(item.addedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimos completados y fallidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {/* Failed Items */}
              {queueStatus?.recentFailed?.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 mb-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">Fallido</span>
                  </div>
                  <p className="text-sm"><strong>NPC:</strong> {item.npcId}</p>
                  {item.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error: {item.error}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(item.completedAt)}
                  </p>
                </div>
              ))}
              
              {/* Completed Items */}
              {queueStatus?.recentCompleted?.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 mb-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">Completado</span>
                    {item.processingTimeMs && (
                      <Badge variant="outline" className="ml-auto">
                        {formatTime(item.processingTimeMs)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm"><strong>NPC:</strong> {item.npcId}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(item.completedAt)}
                  </p>
                </div>
              ))}

              {queueStatus?.recentFailed?.length === 0 && queueStatus?.recentCompleted?.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Sin actividad reciente
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Zap className="h-6 w-6 text-yellow-500" />
            <div>
              <h4 className="font-medium">Cómo funciona la cola</h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Los requests de <strong>chat</strong> se procesan secuencialmente (uno a la vez)</li>
                <li>• Otros modos (resumen_sesion, resumen_npc, etc.) se ejecutan directamente sin cola</li>
                <li>• Tiempo máximo de espera: 3 minutos</li>
                <li>• Reintentos automáticos: hasta 2 veces</li>
                <li>• Estado persistido en <code className="text-xs bg-muted px-1 rounded">db/chat-queue.json</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

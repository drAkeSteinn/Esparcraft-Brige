'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Loader2, CheckCircle, AlertCircle, Clock, Layers, Info, Power, PowerOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResumenGeneralStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentPhase?: string;
  phaseProgress?: {
    phase: string;
    current: number;
    total: number;
    message: string;
  }[];
  overallProgress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  config?: {
    minMessages: number;
    phases: {
      sesiones: boolean;
      npcs: boolean;
      edificios: boolean;
      pueblos: boolean;
      mundos: boolean;
    };
  };
  stats?: {
    phases: {
      sesiones?: { completed: number; skipped: number };
      npcs?: { completed: number; skipped: number };
      edificios?: { completed: number; skipped: number };
      pueblos?: { completed: number; skipped: number };
      mundos?: { completed: number; skipped: number };
    };
  };
}

export default function ResumenGeneral() {
  const [status, setStatus] = useState<ResumenGeneralStatus>({ status: 'idle', overallProgress: 0 });
  const [loading, setLoading] = useState(false);
  const msgState = useState(10);
  const [minMessages, setMinMessages] = msgState;
  const [phases, setPhases] = useState({
    sesiones: true,
    npcs: true,
    edificios: true,
    pueblos: true,
    mundos: true
  });

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/resumen-general/status');
      const result = await response.json();
      setStatus(result);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Cargar minMessages desde la config unificada (vía /api/resumen-general/config)
    fetch('/api/resumen-general/config')
      .then((r) => r.json())
      .then((result) => {
        if (result.success && result.data?.minMessages) {
          setMinMessages(result.data.minMessages);
        }
      })
      .catch((err) => console.error('Error cargando config de resumen:', err));

    const interval = setInterval(() => {
      if (status.status === 'running') {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status.status, fetchStatus]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/resumen-general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minMessages,
          phases
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Resumen General Iniciado',
          description: 'El proceso se está ejecutando en segundo plano'
        });
        await fetchStatus();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo iniciar el resumen general',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error starting resumen general:', error);
      toast({
        title: 'Error',
        description: 'Error de comunicación con el servidor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-';
    
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const duration = end - start;
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    switch (status.status) {
      case 'running':
        return <Badge className="bg-green-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> ON</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> Completado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="secondary"><PowerOff className="h-3 w-3 mr-1" /> OFF</Badge>;
    }
  };

  const getCurrentPhaseName = () => {
    const phaseNames: Record<string, string> = {
      'sesiones': 'Resumen de Sesiones',
      'npcs': 'Resumen de NPCs',
      'edificios': 'Resumen de Edificios',
      'pueblos': 'Resumen de Pueblos',
      'mundos': 'Resumen de Mundos',
      'iniciando': 'Iniciando...'
    };
    return phaseNames[status.currentPhase || ''] || status.currentPhase || '-';
  };

  const PhaseStatCard = ({ 
    title, 
    icon, 
    stats, 
    enabled 
  }: { 
    title: string; 
    icon: string; 
    stats?: { completed: number; skipped: number };
    enabled: boolean;
  }) => {
    if (!enabled) return null;
    
    return (
      <div className="p-4 border rounded-md bg-card">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground mb-1">{title}</div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">{stats?.completed || 0}</span>
                <span className="text-xs text-muted-foreground">realizados</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-yellow-600">{stats?.skipped || 0}</span>
                <span className="text-xs text-muted-foreground">ignorados</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NoDataCard = () => (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Sin Datos de Ejecución</CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              No hay datos registrados de ejecuciones anteriores
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const hasData = status.stats?.phases && Object.keys(status.stats.phases).length > 0;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Resumen General
              {status.status === 'running' && (
                <Badge className="bg-green-500 animate-pulse">
                  <Power className="h-3 w-3 mr-1" />
                  Ejecutándose
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Proceso de resumen jerárquico: Sesiones → NPCs → Edificios → Pueblos → Mundos
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fase actual */}
          {status.status === 'running' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progreso Total</span>
                <span className="font-medium">{status.overallProgress.toFixed(1)}%</span>
              </div>
              <Progress value={status.overallProgress} className="h-2" />
              <div className="text-sm text-muted-foreground">
                Fase actual: <span className="font-medium">{getCurrentPhaseName()}</span>
              </div>
            </div>
          )}

          {/* Tiempo transcurrido */}
          {status.startedAt && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="text-muted-foreground">Tiempo:</span>
              </div>
              <div className="font-medium">
                {formatDuration(status.startedAt, status.completedAt)}
                {status.status === 'running' && ' (ejecutándose...)'}
              </div>
            </div>
          )}

          {/* Error display */}
          {status.error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">Error</div>
                  <div className="mt-1 text-destructive/80">{status.error}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini Dashboard de Estadísticas */}
      {hasData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Estadísticas de Ejecución
            </CardTitle>
            <CardDescription>
              Resúmenes realizados en la última ejecución
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Última ejecución */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Inicio</div>
                <div className="text-sm font-medium">
                  {status.startedAt ? formatDateTime(status.startedAt) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Final</div>
                <div className="text-sm font-medium">
                  {status.completedAt ? formatDateTime(status.completedAt) : '-'}
                </div>
              </div>
            </div>

            {/* Estadísticas por fase */}
            <div className="grid gap-3">
              <PhaseStatCard
                title="Resumen de Sesiones"
                icon="💬"
                stats={status.stats?.phases?.sesiones}
                enabled={status.config?.phases?.sesiones ?? false}
              />
              <PhaseStatCard
                title="Resumen de NPCs"
                icon="👥"
                stats={status.stats?.phases?.npcs}
                enabled={status.config?.phases?.npcs ?? false}
              />
              <PhaseStatCard
                title="Resumen de Edificios"
                icon="🏢"
                stats={status.stats?.phases?.edificios}
                enabled={status.config?.phases?.edificios ?? false}
              />
              <PhaseStatCard
                title="Resumen de Pueblos"
                icon="🏘️"
                stats={status.stats?.phases?.pueblos}
                enabled={status.config?.phases?.pueblos ?? false}
              />
              <PhaseStatCard
                title="Resumen de Mundos"
                icon="🌍"
                stats={status.stats?.phases?.mundos}
                enabled={status.config?.phases?.mundos ?? false}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <NoDataCard />
      )}

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Define los parámetros para el resumen general</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Min Messages — LEÍDO DE LA CONFIG UNIFICADA (no editable aquí) */}
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <Label>Mínimo de mensajes para resumir sesión</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">{minMessages}</Badge>
              <span className="text-xs text-muted-foreground">
                Configurado en <strong>Sesiones → Configuración → Resumen de sesión</strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Solo se resumirán sesiones con al menos este número de mensajes.
              Para cambiarlo, ve a la pestaña Sesiones → Configuración.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Fases a ejecutar
            </Label>
            <div className="grid gap-3">
              {[
                { key: 'sesiones', label: 'Resumen de Sesiones', icon: '💬' },
                { key: 'npcs', label: 'Resumen de NPCs', icon: '👥' },
                { key: 'edificios', label: 'Resumen de Edificios', icon: '🏢' },
                { key: 'pueblos', label: 'Resumen de Pueblos', icon: '🏘️' },
                { key: 'mundos', label: 'Resumen de Mundos', icon: '🌍' }
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={phases[key as keyof typeof phases]}
                    onChange={(e) => setPhases({
                      ...phases,
                      [key]: e.target.checked
                    })}
                    disabled={status.status === 'running'}
                    className="w-4 h-4 accent-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={status.status === 'running' || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Iniciando...
              </>
            ) : status.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ejecutándose...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Resumen General
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Detalle de progreso - solo cuando está ejecutándose */}
      {status.status === 'running' && status.phaseProgress && status.phaseProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Progreso</CardTitle>
            <CardDescription>Estado de cada fase del proceso</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {status.phaseProgress.map((phase, index) => (
                  <div key={index} className="p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{phase.phase}</Badge>
                        <span className="text-sm font-medium">{phase.message}</span>
                      </div>
                      {phase.total > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {phase.current} / {phase.total}
                        </span>
                      ) : null}
                    </div>
                    {phase.total > 0 && (
                      <Progress value={(phase.current / phase.total) * 100} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Última ejecución completada */}
      {status.status === 'completed' && status.startedAt && status.completedAt && !hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Última Ejecución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inicio:</span>
                <div className="font-medium">{new Date(status.startedAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>
                <div className="font-medium">{new Date(status.completedAt).toLocaleString()}</div>
              </div>
            </div>
            {status.config && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Configuración utilizada:</div>
                <div className="text-xs space-y-1">
                  <div>Mínimo de mensajes: {status.config.minMessages}</div>
                  <div>
                    Fases: {Object.entries(status.config.phases)
                      .filter(([_, enabled]) => enabled)
                      .map(([key]) => key)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

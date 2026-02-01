'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Loader2, CheckCircle, AlertCircle, Clock, Layers } from 'lucide-react';
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
}

export default function ResumenGeneralTab() {
  const [status, setStatus] = useState<ResumenGeneralStatus>({ status: 'idle', overallProgress: 0 });
  const [loading, setLoading] = useState(false);
  const [minMessages, setMinMessages] = useState(10);
  const [phases, setPhases] = useState({
    sesiones: true,
    npcs: true,
    edificios: true,
    pueblos: true,
    mundos: true
  });

  // Poll status every 2 seconds when running
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

  const formatDuration = (startedAt?: string) => {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const duration = now - start;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusBadge = () => {
    switch (status.status) {
      case 'running':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Ejecutando</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Inactivo</Badge>;
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

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Resumen General</CardTitle>
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

          {status.startedAt && (
            <div className="text-sm text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Tiempo transcurrido: {formatDuration(status.startedAt)}
            </div>
          )}

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

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Define los parámetros para el resumen general</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Min Messages */}
          <div className="space-y-2">
            <Label htmlFor="minMessages">Mínimo de mensajes para resumir sesión</Label>
            <Input
              id="minMessages"
              type="number"
              min="1"
              value={minMessages}
              onChange={(e) => setMinMessages(parseInt(e.target.value) || 1)}
              disabled={status.status === 'running'}
            />
            <p className="text-xs text-muted-foreground">
              Solo se resumirán sesiones con al menos este número de mensajes
            </p>
          </div>

          {/* Phases */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Fases a ejecutar
            </Label>
            <div className="grid gap-3">
              {[
                { key: 'sesiones', label: 'Resumen de Sesiones', icon: '💬' },
                { key: 'npcs', label: 'Resumen de NPCs', icon: '👤' },
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

          {/* Start Button */}
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
                Ejecutando...
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

      {/* Phase Progress Details */}
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

      {/* Last Run Info */}
      {status.status === 'completed' && status.startedAt && status.completedAt && (
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

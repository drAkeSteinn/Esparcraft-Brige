'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Loader2, CheckCircle, AlertCircle, Clock, Layers, Toggle, FileText, User, Building, Map, Globe } from 'lucide-react';
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
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    phases: {
      sesiones?: { completed: number; skipped: number };
      npcs?: { completed: number; skipped: number };
      edificios?: { completed: number; skipped: number };
      pueblos?: { completed: number; skipped: number };
      mundos?: { completed: number; skipped: number };
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

  const formatNumber = (num: number) => num.toLocaleString();

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
            <Toggle
              checked={status.status === 'running'}
              onCheckedChange={(checked) => {
                if (!checked) {
                  // TODO: Implementar lógica para detener el resumen general
                  toast({
                    title: 'Atención',
                    description: 'Esta funcionalidad no está implementada aún'
                  });
                }
              }}
              disabled={status.status === 'running' || loading}
            />
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
              Tiempo transcurrido: {formatDuration(status.startedAt, status.completedAt)}
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

      {/* Mini Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dashboard de Ejecución</CardTitle>
        </CardHeader>
        <CardContent>
          {!status.stats || !status.stats.startedAt ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sin datos de ejecución</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No hay datos disponibles de ejecuciones anteriores. 
                Inicia el Resumen General para ver las estadísticas de la ejecución aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Date and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    Última Ejecución
                  </div>
                  <div className="text-sm font-medium">
                    {status.stats.startedAt ? new Date(status.stats.startedAt).toLocaleString() : '-'}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <RefreshCw className="h-3 w-3" />
                    Duración Total
                  </div>
                  <div className="text-sm font-medium">
                    {status.stats.duration ? formatNumber(Math.round(status.stats.duration / 1000)) + 's' : '-'}
                  </div>
                </div>
              </div>

              {/* Phase Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Sesiones */}
                {status.stats.phases?.sesiones && (
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Sesiones</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Realizados</div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(status.stats.phases.sesiones.completed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ignorados</div>
                        <div className="text-sm font-semibold text-muted-500">
                          {formatNumber(status.stats.phases.sesiones.skipped)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NPCs */}
                {status.stats.phases?.npcs && (
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">NPCs</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Realizados</div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(status.stats.phases.npcs.completed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ignorados</div>
                        <div className="text-sm font-semibold text-muted-500">
                          {formatNumber(status.stats.phases.npcs.skipped)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edificios */}
                {status.stats.phases?.edificios && (
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Edificios</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Realizados</div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(status.stats.phases.edificios.completed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ignorados</div>
                        <div className="text-sm font-semibold text-muted-500">
                          {formatNumber(status.stats.phases.edificios.skipped)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pueblos */}
                {status.stats.phases?.pueblos && (
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Map className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Pueblos</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Realizados</div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(status.stats.phases.pueblos.completed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ignorados</div>
                        <div className="text-sm font-semibold text-muted-500">
                          {formatNumber(status.stats.phases.pueblos.skipped)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mundos */}
                {status.stats.phases?.mundos && (
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Mundos</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Realizados</div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(status.stats.phases.mundos.completed)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ignorados</div>
                        <div className="text-sm font-semibold text-muted-500">
                          {formatNumber(status.stats.phases.mundos.skipped)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </CardContent>
        </Card>

      {/* Execution Stats - Detalles */}
      {status.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalles de Ejecución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Inicio:</span>
                <div className="text-sm font-medium">
                  {status.stats.startedAt ? new Date(status.stats.startedAt).toLocaleString() : '-'}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Fin:</span>
                <div className="text-sm font-medium">
                  {status.stats.completedAt ? new Date(status.stats.completedAt).toLocaleString() : '-'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <span className="text-sm text-muted-foreground">Duración:</span>
                <div className="text-sm font-medium">
                  {status.stats.duration ? formatNumber(Math.round(status.stats.duration / 1000)) + 's' : '-'}
                </div>
              </div>
            </div>

            {/* Phase Stats */}
            <div className="space-y-3 mt-4">
              {status.stats.phases?.sesiones && (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Sesiones</Badge>
                  </div>
                  <div className="text-sm">
                    Completados: {formatNumber(status.stats.phases.sesiones.completed)}
                    {status.stats.phases.sesiones.skipped > 0 && (
                      <span className="text-muted-foreground">
                        ({formatNumber(status.stats.phases.sesiones.skipped)} ignorados)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {status.stats.phases?.npcs && (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>NPCs</Badge>
                  </div>
                  <div className="text-sm">
                    Completados: {formatNumber(status.stats.phases.npcs.completed)}
                    {status.stats.phases.npcs.skipped > 0 && (
                      <span className="text-muted-foreground">
                        ({formatNumber(status.stats.phases.npcs.skipped)} ignorados)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {status.stats.phases?.edificios && (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Edificios</Badge>
                  </div>
                  <div className="text-sm">
                    Completados: {formatNumber(status.stats.phases.edificios.completed)}
                    {status.stats.phases.edificios.skipped > 0 && (
                      <span className="text-muted-foreground">
                        ({formatNumber(status.stats.phases.edificios.skipped)} ignorados)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {status.stats.phases?.pueblos && (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Pueblos</Badge>
                  </div>
                  <div className="text-sm">
                    Completados: {formatNumber(status.stats.phases.pueblos.completed)}
                    {status.stats.phases.pueblos.skipped > 0 && (
                      <span className="text-muted-foreground">
                        ({formatNumber(status.stats.phases.pueblos.skipped)} ignorados
                      </span>
                    )}
                  </div>
                </div>
              )}

              {status.stats.phases?.mundos && (
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Mundos</Badge>
                  </div>
                  <div className="text-sm">
                    Completados: {formatNumber(status.stats.phases.mundos.completed)}
                    {status.stats.phases.mundos.skipped > 0 && (
                      <span className="text-muted-foreground">
                        ({formatNumber(status.stats.phases.mundos.skipped)} ignorados)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
      {status.status === 'completed' && status.stats && (
        <Card>
          <CardHeader>
            <CardTitle>Última Ejecución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inicio:</span>
                <div className="font-medium">{new Date(status.stats.startedAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>
                <div className="font-medium">{new Date(status.stats.completedAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <span className="text-muted-foreground">Duración:</span>
                <div className="font-medium">
                  {status.stats.duration ? formatNumber(Math.round(status.stats.duration / 1000)) + 's' : '-'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Fases ejecutadas:</span>
                <div className="font-medium">
                  {Object.entries(status.config.phases || {}).filter(([_, enabled]) => enabled).length}
                </div>
              </div>
            </div>

            {status.stats && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Estadísticas de Fases:</div>
                <div className="text-xs space-y-1">
                  {status.stats.phases?.sesiones && (
                    <div>
                      <strong>Sesiones:</strong> {formatNumber(status.stats.phases.sesiones.completed)} completados, {status.stats.phases.sesiones.skipped} ignorados
                    </div>
                  )}
                  {status.stats.phases?.npcs && (
                    <div>
                      <strong>NPCs:</strong> {formatNumber(status.stats.phases.npcs.completed)} completados, {status.stats.phases.npcs.skipped} ignorados
                    </div>
                  )}
                  {status.stats.phases?.edificios && (
                    <div>
                      <strong>Edificios:</strong> {formatNumber(status.stats.phases.edificios.completed)} completados, {status.stats.phases.edificios.skipped} ignorados
                    </div>
                  )}
                  {status.stats.phases?.pueblos && (
                    <div>
                      <strong>Pueblos:</strong> {formatNumber(status.stats.phases.pueblos.completed)} completados, {status.stats.phases.pueblos.skipped} ignorados
                    </div>
                  )}
                  {status.stats.phases?.mundos && (
                    <div>
                      <strong>Mundos:</strong> {formatNumber(status.stats.phases.mundos.completed)} completados, {status.stats.phases.mundos.skipped} ignorados
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

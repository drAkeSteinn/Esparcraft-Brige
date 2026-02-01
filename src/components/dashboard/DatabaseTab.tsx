'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, Download, Upload, RefreshCw, Save, HardDrive, Clock, FileText, AlertTriangle, CheckCircle, Trash2, ArrowRight, ArrowLeft, Zap } from 'lucide-react';

interface BackupInfo {
  filename: string;
  timestamp: string;
  isoDate: string;
  sizeKB: number;
  isManual: boolean;
  displayName: string;
}

export default function DatabaseTab() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [restoredBackup, setRestoredBackup] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

  // Cargar lista de backups al montar
  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/db/backups');
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.data);
        setMessage({ type: null, text: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error cargando backups' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al servidor' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupAuto = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Backup automático creado exitosamente' });
        await loadBackups();
        setBackupName('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Error creando backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al servidor' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupManual = async () => {
    if (!backupName.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un nombre para el backup' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backupName.trim() }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Backup "${backupName.trim()}" creado exitosamente` });
        await loadBackups();
        setBackupName('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Error creando backup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al servidor' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres restaurar el backup "${filename}"?\n\nEsto reemplazará la base de datos actual con el backup seleccionado.`)) {
      return;
    }

    setIsRestoring(true);
    setSelectedBackup(filename);
    
    try {
      const response = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Backup "${filename}" restaurado exitosamente. Recarga la página para aplicar cambios.` });
        setRestoredBackup(filename);
        setSelectedBackup(null);
        await loadBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error restaurando backup' });
        setSelectedBackup(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al servidor' });
      setSelectedBackup(null);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatSize = (sizeKB: number) => {
    if (sizeKB < 1024) {
      return `${sizeKB} KB`;
    }
    return `${(sizeKB / 1024).toFixed(2)} MB`;
  };

  const getTypeIcon = (isManual: boolean) => {
    return isManual ? <Save className="h-4 w-4 text-orange-500" /> : <Clock className="h-4 w-4 text-blue-500" />;
  };

  // Ordenar backups por fecha descendente (más reciente primero)
  const sortedBackups = [...backups].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-6">
      {/* Header con acción de refrescar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Base de Datos</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona backups y restauración de la base de datos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBackups}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refrescar
        </Button>
      </div>

      {/* Mensaje de estado */}
      {message.type && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className="mb-4">
          <CheckCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Crear Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Crear Backup
          </CardTitle>
          <CardDescription>
            Haz respaldos de seguridad de tu base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backup automático rápido */}
          <div className="space-y-2">
            <Label>Backup Automático</Label>
            <Button
              onClick={handleBackupAuto}
              disabled={isLoading || isRestoring}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Crear Backup Rápido
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Crea un backup con timestamp automático en el nombre
            </p>
          </div>

          <div className="border-t my-4"></div>

          {/* Backup manual con nombre */}
          <div className="space-y-2">
            <Label htmlFor="backupName">Backup Manual con Nombre</Label>
            <div className="flex gap-2">
              <Input
                id="backupName"
                placeholder="Ej: Antes de migración, Versión 1.0..."
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                disabled={isLoading || isRestoring}
                className="flex-1"
                maxLength={50}
              />
              <Button
                onClick={handleBackupManual}
                disabled={isLoading || isRestoring || !backupName.trim()}
                variant="secondary"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Agrega un nombre descriptivo para identificar el backup fácilmente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backups Disponibles
          </CardTitle>
          <CardDescription>
            {sortedBackups.length} backups encontrados • Haz clic en "Restaurar" para cargar una versión anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && sortedBackups.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-2" />
              <p>Cargando backups...</p>
            </div>
          ) : sortedBackups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-4">
              <AlertTriangle className="h-12 w-12 text-orange-500" />
              <p className="text-lg">No hay backups disponibles</p>
              <p className="text-sm">Crea tu primer backup usando los botones de arriba</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedBackups.map((backup, index) => {
                const isActive = backup.filename === restoredBackup;
                const isLatest = index === 0;

                return (
                  <div
                    key={backup.filename}
                    className={`
                      border rounded-lg p-4 space-y-2 transition-all hover:shadow-md
                      ${isActive ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 
                       isLatest ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' : 
                       'bg-card'}
                    `}
                  >
                    {/* Header del backup */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        {getTypeIcon(backup.isManual)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={backup.filename}>
                            {backup.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {backup.displayName}
                          </p>
                        </div>
                      </div>
                      
                      {/* Indicadores */}
                      <div className="flex items-center gap-2 text-xs">
                        {isLatest && !isActive && (
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 px-2 py-1 rounded-full font-medium">
                            Último
                          </span>
                        )}
                        {isActive && (
                          <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {formatSize(backup.sizeKB)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={isRestoring}
                        size="sm"
                        variant={isActive ? "outline" : "default"}
                        className={`
                          ${isActive ? 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400' :
                           'w-full'}
                        `}
                      >
                        {isRestoring && selectedBackup === backup.filename ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : isActive ? (
                          <>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Deshacer
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Restaurar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de ayuda */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Información
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <span className="font-medium">Backups automáticos:</span> Tienen formato YYYY-MM-DDTHH-MM-SS
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <span className="font-medium">Backups manuales:</span> Tienen formato YYYY-MM-DDTHH-MM-SS-manual-NOMBRE
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <span className="font-medium">Sistema de rollback:</span> Se crea un backup automático antes de cada restauración
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <span className="font-medium">Limpieza:</span> Solo se mantienen los últimos 20 backups
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <span className="font-medium">Ubicación:</span> data-esparcraft/db-backup/
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

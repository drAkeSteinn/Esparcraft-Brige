'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Trash2,
  Calendar,
  FileText,
  Globe,
  MapPin,
  Building,
  Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { EntityType } from '@/lib/genericBackupManager';

interface BackupMetadata {
  id: string;
  entityType: EntityType;
  filename: string;
  exportDate: string;
  itemCount: number;
  fileSize: number;
  checksum: string;
  source: 'manual' | 'auto';
}

interface GenericBackupSectionProps {
  entityType: EntityType;
  entityName: string;
  entityNamePlural: string;
  apiPath: string;
}

const entityTypeConfig: Record<EntityType, { icon: any; color: string }> = {
  worlds: { icon: Globe, color: 'text-blue-600' },
  pueblos: { icon: MapPin, color: 'text-green-600' },
  edificios: { icon: Building, color: 'text-orange-600' },
  'place-types': { icon: Layout, color: 'text-purple-600' }
};

export default function GenericBackupSection({
  entityType,
  entityName,
  entityNamePlural,
  apiPath
}: GenericBackupSectionProps) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const config = entityTypeConfig[entityType];

  useEffect(() => {
    loadBackups();
  }, [entityType]);

  const loadBackups = async () => {
    console.log(`[GenericBackupSection] Cargando backups para ${entityType} (${apiPath})`);
    try {
      const response = await fetch(`/api/${apiPath}/backups`);
      console.log('[GenericBackupSection] Response status:', response.status);
      const result = await response.json();
      console.log('[GenericBackupSection] Backups recibidos:', result);
      
      if (result.success) {
        setBackups(result.data.backups);
        console.log('[GenericBackupSection] Backups actualizados en estado:', result.data.backups.length);
      }
    } catch (error) {
      console.error('[GenericBackupSection] Error loading backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await fetch(`/api/${apiPath}/export-all`);
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entityType}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: `${entityNamePlural} exportados correctamente`
      });
    } catch (error) {
      console.error('Error exporting all:', error);
      toast({
        title: 'Error',
        description: `No se pudieron exportar los ${entityNamePlural}`,
        variant: 'destructive'
      });
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await fetch(`/api/${apiPath}/backups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Backup creado',
          description: `Backup guardado con ${result.data.itemCount} ${entityNamePlural}`
        });
        loadBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el backup',
        variant: 'destructive'
      });
    }
  };

  const handleImportAll = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Archivo inválido: no contiene items');
      }

      setImportPreview({
        itemCount: data.items.length,
        filename: file.name,
        exportDate: data.exportDate || 'Desconocido',
        data
      });
      setImportOpen(true);
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo leer el archivo',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    try {
      setImporting(true);
      const response = await fetch(`/api/${apiPath}/import-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: importPreview.data,
          createBackup: true
        })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Importación exitosa',
          description: `${result.data.importedCount} ${entityNamePlural} importados correctamente`
        });
        setImportOpen(false);
        setImportPreview(null);
        window.location.reload();
      } else {
        throw new Error(result.error || 'No se pudo importar');
      }
    } catch (error) {
      console.error('Error importing all:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `No se pudieron importar los ${entityNamePlural}`,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(
      `¿Estás seguro de que deseas restaurar este backup?\n\n` +
      `Esto creará un backup automático del estado actual y reemplazará todos los ${entityNamePlural}.`
    )) {
      return;
    }

    try {
      const response = await fetch(`/api/${apiPath}/backups/${encodeURIComponent(filename)}`, {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Backup restaurado',
          description: `${result.data.itemCount} ${entityNamePlural} restaurados correctamente`
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: 'Error',
        description: 'No se pudo restaurar el backup',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    console.log('[GenericBackupSection] Intentando eliminar backup:', filename);
    if (!confirm('¿Estás seguro de que deseas eliminar este backup?')) {
      console.log('[GenericBackupSection] Cancelado por usuario');
      return;
    }

    try {
      const url = `/api/${apiPath}/backups/${encodeURIComponent(filename)}`;
      console.log('[GenericBackupSection] URL de DELETE:', url);
      
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      console.log('[GenericBackupSection] Status de respuesta:', response.status);
      const result = await response.json();
      console.log('[GenericBackupSection] Resultado:', result);

      if (result.success) {
        toast({
          title: 'Backup eliminado',
          description: 'El backup ha sido eliminado correctamente'
        });
        await loadBackups();
      } else {
        console.error('[GenericBackupSection] Error al eliminar:', result);
        toast({
          title: 'Error',
          description: result.error || 'No se pudo eliminar el backup',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[GenericBackupSection] Error eliminando backup:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el backup',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/${apiPath}/backups/${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el backup',
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const Icon = config.icon;

  return (
    <>
      <Card className="mt-6 border-2 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle>Gestión de Backups</CardTitle>
          </div>
          <CardDescription>
            Exporta, importa y gestiona copias de seguridad de todos los {entityNamePlural}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Button
              variant="outline"
              onClick={handleExportAll}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Todos
            </Button>

            <Button
              variant="outline"
              onClick={() => document.getElementById(`import-all-${entityType}`)?.click()}
              className="w-full"
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Archivo
            </Button>
            <Input
              id={`import-all-${entityType}`}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportAll}
            />

            <Button
              variant="outline"
              onClick={handleCreateBackup}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Crear Backup
            </Button>

            <Button
              variant="outline"
              onClick={loadBackups}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">
                Backups Locales ({backups.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                {backups.length > 0 && `Total: ${formatFileSize(
                  backups.reduce((acc, b) => acc + b.fileSize, 0)
                )}`}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando backups...
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay backups guardados</p>
                <p className="text-xs mt-1">Crea un backup manual o importa {entityNamePlural}</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {backups.map((backup) => (
                  <AccordionItem key={backup.id} value={backup.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          {backup.source === 'auto' ? (
                            <RefreshCw className={`h-4 w-4 text-muted-foreground`} />
                          ) : (
                            <HardDrive className={`h-4 w-4 ${config.color}`} />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {backup.source === 'auto' ? 'Backup auto' : 'Backup'}
                            </span>
                            {backup.source === 'auto' && (
                              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(backup.exportDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 pr-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{backup.itemCount} {entityNamePlural}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(backup.fileSize)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-3">
                        <div className="grid gap-2 md:grid-cols-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreBackup(backup.filename)}
                            className="w-full"
                          >
                            <RefreshCw className="h-3 w-3 mr-1.5" />
                            Restaurar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup.filename)}
                            className="w-full"
                          >
                            <Download className="h-3 w-3 mr-1.5" />
                            Descargar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(backup.checksum);
                              toast({
                                title: 'Copiado',
                                description: 'Checksum copiado al portapapeles'
                              });
                            }}
                            className="w-full"
                          >
                            <FileText className="h-3 w-3 mr-1.5" />
                            Copiar Hash
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup.filename)}
                            className="w-full text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            Eliminar
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Archivo:</strong> {backup.filename}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Importación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas importar este archivo?
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Archivo:</span>
                  <span className="text-muted-foreground">{importPreview.filename}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fecha de exportación:</span>
                  <span className="text-muted-foreground">
                    {formatDate(importPreview.exportDate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{entityNamePlural} a importar:</span>
                  <span className="font-medium text-primary">{importPreview.itemCount}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">⚠️ Advertencia:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Se creará un backup automático del estado actual</li>
                  <li>Todos los {entityNamePlural} actuales serán reemplazados</li>
                  <li>Esta acción no se puede deshacer</li>
                </ul>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                setImportPreview(null);
              }}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing}
            >
              {importing ? 'Importando...' : 'Confirmar Importación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

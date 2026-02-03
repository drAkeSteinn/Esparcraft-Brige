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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';

interface NPCBackupMetadata {
  id: string;
  filename: string;
  exportDate: string;
  npcCount: number;
  fileSize: number;
  checksum: string;
  source: 'manual' | 'auto';
}

export default function NPCBackupSection() {
  const [backups, setBackups] = useState<NPCBackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/npcs/backups');
      const result = await response.json();
      if (result.success) {
        setBackups(result.data.backups);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await fetch('/api/npcs/export-all');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `npcs-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Éxito',
        description: 'Todos los NPCs exportados correctamente'
      });
    } catch (error) {
      console.error('Error exporting all NPCs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar los NPCs',
        variant: 'destructive'
      });
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await fetch('/api/npcs/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Backup creado',
          description: `Backup guardado con ${result.data.npcCount} NPCs`
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

      // Validar estructura básica
      if (!data.npcs || !Array.isArray(data.npcs)) {
        throw new Error('Archivo inválido: no contiene NPCs');
      }

      setImportPreview({
        npcCount: data.npcs.length,
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
      const response = await fetch('/api/npcs/import-all', {
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
          description: `${result.data.importedCount} NPCs importados correctamente`
        });
        setImportOpen(false);
        setImportPreview(null);
        // Recargar página para refrescar datos
        window.location.reload();
      } else {
        throw new Error(result.error || 'No se pudo importar');
      }
    } catch (error) {
      console.error('Error importing all NPCs:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron importar los NPCs',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(
      `¿Estás seguro de que deseas restaurar este backup?\n\n` +
      `Esto creará un backup automático del estado actual y reemplazará todos los NPCs.`
    )) {
      return;
    }

    try {
      const response = await fetch(`/api/npcs/backups/${encodeURIComponent(filename)}`, {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Backup restaurado',
          description: `${result.data.npcCount} NPCs restaurados correctamente`
        });
        // Recargar página
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
    if (!confirm('¿Estás seguro de que deseas eliminar este backup?')) return;

    try {
      const response = await fetch(`/api/npcs/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Backup eliminado',
          description: 'El backup ha sido eliminado correctamente'
        });
        loadBackups();
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el backup',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/npcs/backups/${encodeURIComponent(filename)}`);
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

  return (
    <>
      <Card className="mt-6 border-2 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <CardTitle>Gestión de Backups</CardTitle>
          </div>
          <CardDescription>
            Exporta, importa y gestiona copias de seguridad de todos los NPCs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Acciones principales */}
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
              onClick={() => document.getElementById('import-all-input')?.click()}
              className="w-full"
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Archivo
            </Button>
            <Input
              id="import-all-input"
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

          {/* Lista de backups */}
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
                <p className="text-xs mt-1">Crea un backup manual o importa NPCs</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {backups.map((backup) => (
                  <AccordionItem key={backup.id} value={backup.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          {backup.source === 'auto' ? (
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <HardDrive className="h-4 w-4 text-primary" />
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
                            <div className="text-sm font-medium">{backup.npcCount} NPCs</div>
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

      {/* Diálogo de confirmación de importación */}
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
                  <span className="font-medium">NPCs a importar:</span>
                  <span className="font-medium text-primary">{importPreview.npcCount}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">⚠️ Advertencia:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Se creará un backup automático del estado actual</li>
                  <li>Todos los NPCs actuales serán reemplazados</li>
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

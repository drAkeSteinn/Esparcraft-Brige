'use client';

import { Map, Construction, Layers, MousePointer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MapTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mapa 2D Interactivo</h2>
          <p className="text-muted-foreground">Visualización espacial avanzada del mundo narrativo</p>
        </div>
      </div>

      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Construction className="h-12 w-12 text-primary" />
            </div>
            <div className="bg-primary/10 p-4 rounded-full">
              <Map className="h-12 w-12 text-primary" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-2">Nuevo Mapa 2D en Construcción</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Estamos implementando un mapa interactivo avanzado con Canvas 2D (Konva)
            que incluirá: pan/zoom fluido, selección de edificios/NPCs, capas,
            tooltips, modo edición y más.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <MousePointer className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Pan/Zoom</span>
              <span className="text-xs text-muted-foreground">Fluid navigation</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Layers className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Capas</span>
              <span className="text-xs text-muted-foreground">Múltiples niveles</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Map className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Edición</span>
              <span className="text-xs text-muted-foreground">Drag & Drop</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
              <Construction className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Tooltips</span>
              <span className="text-xs text-muted-foreground">Información detallada</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-600">
              <strong>Próximamente:</strong> Selección de edificios con click, búsqueda avanzada,
              heatmap de actividad, timeline y mucho más.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características Planeadas</CardTitle>
          <CardDescription>Lista de funcionalidades que se implementarán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Navegación
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>✓ Zoom con rueda centrado en puntero</li>
                <li>✓ Pan con arrastre (espacio o click medio)</li>
                <li>✓ Selección simple y múltiple</li>
                <li>✓ Drag box para selección</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Sistema de Capas
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>✓ Fondo (imagen/tiles)</li>
                <li>✓ Zonas y pueblos (polígonos)</li>
                <li>✓ Edificios (rectángulos)</li>
                <li>✓ NPCs/Players (íconos)</li>
                <li>✓ UI (tooltips, selección)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Map className="h-4 w-4" />
                Visualización
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>✓ Tooltips por hover</li>
                <li>✓ Highlight al seleccionar</li>
                <li>✓ Panel lateral con detalles</li>
                <li>✓ Búsqueda de elementos</li>
                <li>✓ Highlight por estado</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Construction className="h-4 w-4" />
                Modo Edición
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>✓ Crear rectángulos/polígonos</li>
                <li>✓ Drag handles (redimensionar)</li>
                <li>✓ Snap a grilla (opcional)</li>
                <li>✓ Lock layers</li>
                <li>✓ Persistencia automática</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

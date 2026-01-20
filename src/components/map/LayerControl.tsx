/**
 * Componente LayerControl
 * Panel con toggles para controlar las capas del mapa
 */

'use client';

import { Layer, Circle, Eye, EyeOff, Lock, Unlock, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLayers } from '@/lib/map/useLayers';
import { MapLayerType, LayerConfig } from '@/lib/map/types';

interface LayerControlProps {
  className?: string;
}

/**
 * Componente para controlar las capas del mapa
 * Muestra toggles para visibilidad, bloqueo y opacidad de cada capa
 */
export function LayerControl({ className = '' }: LayerControlProps) {
  const {
    layers,
    activeLayer,
    toggleLayer,
    toggleLock,
    changeOpacity,
    activatePreset
  } = useLayers();

  // Iconos por tipo de capa
  const layerIcons: Record<MapLayerType, React.ReactNode> = {
    background: <Layers className="h-5 w-5" />,
    zones: <MapPin className="h-5 w-5" />,
    buildings: <Building className="h-5 w-5" />,
    npcs: <Users className="h-5 w-5" />,
    routes: <MapPin className="h-5 w-5" />,
    activity: <Activity className="h-5 w-5" />,
    ui: <Eye className="h-5 w-5" />
  };

  // Ordenar capas por z-index para mostrarlas correctamente
  const layerTypes: MapLayerType[] = Object.keys(layers) as MapLayerType[];
  const sortedLayers = layerTypes.sort((a, b) => layers[a].zIndex - layers[b].zIndex);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Capas del Mapa</CardTitle>
        <CardDescription>
          Controla la visibilidad, opacidad y bloqueo de las capas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Presets rápidos */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => activatePreset('all')}
            className="flex-1 px-3 py-2 text-sm rounded-md border hover:bg-muted/50 transition-colors"
          >
            Todo
          </button>
          <button
            onClick={() => activatePreset('buildings-only')}
            className="flex-1 px-3 py-2 text-sm rounded-md border hover:bg-muted/50 transition-colors"
          >
            Edificios
          </button>
          <button
            onClick={() => activatePreset('map-only')}
            className="flex-1 px-3 py-2 text-sm rounded-md border hover:bg-muted/50 transition-colors"
          >
            Solo Mapa
          </button>
        </div>

        {/* Controles de capas individuales */}
        <div className="space-y-3">
          {sortedLayers.map((layerType) => {
            const layer = layers[layerType];
            const isActive = activeLayer === layerType;

            return (
              <div
                key={layer.id}
                className={`
                  p-3 rounded-lg border transition-all duration-200
                  ${isActive ? 'bg-primary/10 border-primary/20' : 'bg-muted/30 border-muted/50 hover:bg-muted/40'}
                  ${layer.locked ? 'opacity-60' : 'opacity-100'}
                `}
                style={{
                  backgroundColor: layer.locked ? 'rgba(100, 100, 100, 0.05)' : undefined
                }}
              >
                {/* Header de la capa */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {/* Toggle de visibilidad */}
                    <button
                      onClick={() => toggleLayer(layerType)}
                      className={`p-1.5 rounded-md transition-colors ${
                        layer.visible
                          ? 'hover:bg-primary/20 text-primary-foreground'
                          : 'hover:bg-muted/50 text-muted-foreground'
                      }`}
                      title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                    >
                      {layer.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    {/* Icono de la capa */}
                    <div
                      className="p-1.5 rounded-md"
                      style={{ backgroundColor: layer.color ? `${layer.color}20` : 'hsl(var(--muted))' }}
                    >
                      {layerIcons[layerType]}
                    </div>

                    {/* Nombre de la capa */}
                    <span className="font-medium flex-1">{layer.name}</span>

                    {/* Toggle de bloqueo (si no es UI) */}
                    {layerType !== 'ui' && (
                      <button
                        onClick={() => toggleLock(layerType)}
                        className={`p-1.5 rounded-md transition-colors ${
                          layer.locked
                            ? 'hover:bg-destructive/20 text-destructive'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                        title={layer.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                      >
                        {layer.locked ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Slider de opacidad */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-16">Opacidad:</span>
                  <Slider
                    value={[layer.opacity]}
                    onValueChange={([value]) => changeOpacity(layerType, value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="flex-1"
                    disabled={layer.locked}
                  />
                  <span className="text-sm w-12 text-right">{Math.round(layer.opacity * 100)}%</span>
                </div>

                {/* Estado de la capa */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {layer.visible ? (
                    <span className="flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-green-500" />
                      Visible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-gray-400" />
                      Oculto
                    </span>
                  )}
                  {layer.locked && (
                    <span className="flex items-center gap-1 ml-2">
                      <Lock className="h-2 w-2 fill-orange-500" />
                      Bloqueado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Información de ayuda */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>💡 Tip:</strong> Las capas visibles se renderizan en el mapa. Las capas bloqueadas no se pueden modificar.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>🎯 Prioridad de renderizado:</strong> UI (z-index: 1000) → NPCs (30) → Edificios (20) → Rutas (15) → Zonas (10) → Fondo (0) → Actividad (5)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

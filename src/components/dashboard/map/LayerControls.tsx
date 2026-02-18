'use client';

import { Layers, ZoomIn, ZoomOut, Maximize, Grid3X3, Globe, MapPin, Building, Users, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapLayerVisibility } from './types';

interface LayerControlsProps {
  layerVisibility: MapLayerVisibility;
  onToggleLayer: (layer: keyof MapLayerVisibility) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  scale: number;
}

export default function LayerControls({
  layerVisibility,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  scale,
}: LayerControlsProps) {
  const layers = [
    { key: 'pueblos' as const, label: 'Regiones', icon: MapPin, color: 'text-green-500' },
    { key: 'edificios' as const, label: 'Edificios', icon: Building, color: 'text-orange-500' },
    { key: 'npcs' as const, label: 'NPCs', icon: Users, color: 'text-pink-500' },
    { key: 'grid' as const, label: 'Grilla', icon: Grid3X3, color: 'text-gray-400' },
    { key: 'labels' as const, label: 'Etiquetas', icon: Type, color: 'text-blue-400' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Controles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onFitScreen}>
            <Maximize className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Layer Toggles */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Capas visibles
          </p>
          {layers.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <Label htmlFor={key} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
              <Switch
                id={key}
                checked={layerVisibility[key]}
                onCheckedChange={() => onToggleLayer(key)}
              />
            </div>
          ))}
        </div>

        {/* Help */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>🖱️ Arrastra para mover</p>
          <p>⚙️ Scroll para zoom</p>
          <p>👆 Click para seleccionar</p>
        </div>
      </CardContent>
    </Card>
  );
}

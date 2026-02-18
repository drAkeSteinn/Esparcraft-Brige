'use client';

import { Globe, MapPin, Building, Users, X, ScrollText, User, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SelectedEntity, ENTITY_COLORS } from './types';
import { World, Pueblo, Edificio, NPC, getCardField } from '@/lib/types';

interface MapSidebarProps {
  selectedEntity: SelectedEntity | null;
  onClose: () => void;
  npcs: NPC[];
  edificios: Edificio[];
  pueblos: Pueblo[];
  worlds: World[];
}

export default function MapSidebar({
  selectedEntity,
  onClose,
  npcs,
  edificios,
  pueblos,
  worlds,
}: MapSidebarProps) {
  if (!selectedEntity) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Selecciona un elemento en el mapa para ver sus detalles
          </p>
        </CardContent>
      </Card>
    );
  }

  const { type, data } = selectedEntity;

  // Renderizar según tipo
  const renderWorldDetails = (world: World) => {
    const worldPueblos = pueblos.filter(p => p.worldId === world.id);
    const worldEdificios = edificios.filter(e => {
      const pueblo = pueblos.find(p => p.id === e.puebloId);
      return pueblo?.worldId === world.id;
    });
    const worldNpcs = npcs.filter(n => n.location.worldId === world.id);

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" style={{ color: ENTITY_COLORS.world.stroke }} />
          <Badge variant="outline" style={{ borderColor: ENTITY_COLORS.world.stroke, color: ENTITY_COLORS.world.stroke }}>
            Mundo
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">{world.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{world.id}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              <MapPin className="h-3 w-3 mr-1" />
              {worldPueblos.length} regiones
            </Badge>
            <Badge variant="secondary">
              <Building className="h-3 w-3 mr-1" />
              {worldEdificios.length} edificios
            </Badge>
            <Badge variant="default" className="bg-primary/80">
              <Users className="h-3 w-3 mr-1" />
              {worldNpcs.length} NPCs
            </Badge>
          </div>

          {world.lore.estado_mundo && (
            <div>
              <p className="text-sm font-medium mb-1">Estado:</p>
              <p className="text-sm text-muted-foreground">{world.lore.estado_mundo}</p>
            </div>
          )}

          {world.lore.rumores.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-[#83673D]" />
                Rumores ({world.lore.rumores.length})
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {world.lore.rumores.map((rumor, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center bg-[#2C2923] text-[#83673D] text-xs rounded">
                      {i + 1}
                    </span>
                    {rumor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {world.lore.eventos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Eventos recientes:</p>
              <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {world.lore.eventos.map((evento, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center bg-muted text-xs rounded">
                      {i + 1}
                    </span>
                    {evento}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderPuebloDetails = (pueblo: Pueblo) => {
    const puebloEdificios = edificios.filter(e => e.puebloId === pueblo.id);
    const puebloNpcs = npcs.filter(n => n.location.puebloId === pueblo.id);
    const world = worlds.find(w => w.id === pueblo.worldId);
    const colors = pueblo.type === 'nacion' ? ENTITY_COLORS.nacion : ENTITY_COLORS.pueblo;

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5" style={{ color: colors.stroke }} />
          <Badge variant="outline" style={{ borderColor: colors.stroke, color: colors.stroke }}>
            {pueblo.type === 'nacion' ? 'Nación' : 'Pueblo'}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">{pueblo.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{pueblo.id}</p>
            {world && (
              <p className="text-xs text-muted-foreground mt-1">
                <Globe className="h-3 w-3 inline mr-1" />
                {world.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              <Building className="h-3 w-3 mr-1" />
              {puebloEdificios.length} edificios
            </Badge>
            <Badge variant="default" className="bg-primary/80">
              <Users className="h-3 w-3 mr-1" />
              {puebloNpcs.length} NPCs
            </Badge>
          </div>

          {pueblo.description && (
            <div>
              <p className="text-sm font-medium mb-1">Descripción:</p>
              <p className="text-sm text-muted-foreground">{pueblo.description}</p>
            </div>
          )}

          {pueblo.lore.estado_pueblo && (
            <div>
              <p className="text-sm font-medium mb-1">Estado:</p>
              <p className="text-sm text-muted-foreground">{pueblo.lore.estado_pueblo}</p>
            </div>
          )}

          {puebloEdificios.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Edificios:</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {puebloEdificios.map(edificio => (
                  <div key={edificio.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <Building className="h-4 w-4 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{edificio.name}</p>
                      <p className="text-xs text-muted-foreground">
                        X: {edificio.area.start.x}-{edificio.area.end.x}, 
                        Z: {edificio.area.start.z}-{edificio.area.end.z}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderEdificioDetails = (edificio: Edificio) => {
    const edificioNpcs = npcs.filter(n => n.location.edificioId === edificio.id);
    const pueblo = pueblos.find(p => p.id === edificio.puebloId);
    const world = worlds.find(w => w.id === edificio.worldId);

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Building className="h-5 w-5" style={{ color: ENTITY_COLORS.edificio.stroke }} />
          <Badge variant="outline" style={{ borderColor: ENTITY_COLORS.edificio.stroke, color: ENTITY_COLORS.edificio.stroke }}>
            Edificio
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">{edificio.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{edificio.id}</p>
            {pueblo && (
              <p className="text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 inline mr-1" />
                {pueblo.name}
                {world && ` (${world.name})`}
              </p>
            )}
          </div>

          {/* Coordenadas */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Coordenadas del área
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Inicio:</span>
                <p className="font-mono">
                  X: {edificio.area.start.x}<br/>
                  Y: {edificio.area.start.y}<br/>
                  Z: {edificio.area.start.z}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>
                <p className="font-mono">
                  X: {edificio.area.end.x}<br/>
                  Y: {edificio.area.end.y}<br/>
                  Z: {edificio.area.end.z}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Tamaño:</span>
                <p className="font-mono">
                  W: {edificio.area.end.x - edificio.area.start.x}<br/>
                  H: {edificio.area.end.y - edificio.area.start.y}<br/>
                  D: {edificio.area.end.z - edificio.area.start.z}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="default" className="bg-primary/80">
              <Users className="h-3 w-3 mr-1" />
              {edificioNpcs.length} NPCs
            </Badge>
          </div>

          {edificio.lore && (
            <div>
              <p className="text-sm font-medium mb-1">Descripción:</p>
              <p className="text-sm text-muted-foreground">{edificio.lore}</p>
            </div>
          )}

          {edificioNpcs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">NPCs en este edificio:</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {edificioNpcs.map(npc => {
                  const npcName = getCardField(npc.card, 'name', 'Sin nombre');
                  const npcAvatar = getCardField(npc.card, 'avatar', null);
                  return (
                    <div key={npc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Avatar className="h-6 w-6">
                        {npcAvatar ? (
                          <AvatarImage src={npcAvatar} alt={npcName} />
                        ) : (
                          <AvatarFallback className="text-xs">{npcName[0]}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">{npcName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderNpcDetails = (npc: NPC) => {
    const npcName = getCardField(npc.card, 'name', 'Sin nombre');
    const npcDescription = getCardField(npc.card, 'description', '');
    const npcPersonality = getCardField(npc.card, 'personality', '');
    const npcAvatar = getCardField(npc.card, 'avatar', null);

    const pueblo = npc.location.puebloId ? pueblos.find(p => p.id === npc.location.puebloId) : null;
    const edificio = npc.location.edificioId ? edificios.find(e => e.id === npc.location.edificioId) : null;
    const world = npc.location.worldId ? worlds.find(w => w.id === npc.location.worldId) : null;

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" style={{ color: ENTITY_COLORS.npc.stroke }} />
          <Badge variant="outline" style={{ borderColor: ENTITY_COLORS.npc.stroke, color: ENTITY_COLORS.npc.stroke }}>
            NPC
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {npcAvatar ? (
                <AvatarImage src={npcAvatar} alt={npcName} />
              ) : (
                <AvatarFallback>{npcName[0]}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="text-lg font-bold">{npcName}</h3>
              <p className="text-xs text-muted-foreground font-mono">{npc.id}</p>
            </div>
          </div>

          {/* Ubicación */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Ubicación
            </p>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Scope:</span> {npc.location.scope}</p>
              {world && <p><span className="text-muted-foreground">Mundo:</span> {world.name}</p>}
              {pueblo && <p><span className="text-muted-foreground">Región:</span> {pueblo.name}</p>}
              {edificio && <p><span className="text-muted-foreground">Edificio:</span> {edificio.name}</p>}
            </div>
          </div>

          {npcDescription && (
            <div>
              <p className="text-sm font-medium mb-1">Descripción:</p>
              <p className="text-sm text-muted-foreground line-clamp-4">{npcDescription}</p>
            </div>
          )}

          {npcPersonality && (
            <div>
              <p className="text-sm font-medium mb-1">Personalidad:</p>
              <p className="text-sm text-muted-foreground line-clamp-3">{npcPersonality}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Detalles</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {type === 'world' && renderWorldDetails(data as World)}
        {type === 'pueblo' && renderPuebloDetails(data as Pueblo)}
        {type === 'edificio' && renderEdificioDetails(data as Edificio)}
        {type === 'npc' && renderNpcDetails(data as NPC)}
      </CardContent>
    </Card>
  );
}

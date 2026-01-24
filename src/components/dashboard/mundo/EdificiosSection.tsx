'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edificio } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function EdificiosSection() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [edificioMemories, setEdificioMemories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [edificiosRes, worldsRes, pueblosRes] = await Promise.all([
        fetch('/api/edificios'),
        fetch('/api/worlds'),
        fetch('/api/pueblos')
      ]);

      const edificiosResult = await edificiosRes.json();
      const worldsResult = await worldsRes.json();
      const pueblosResult = await pueblosRes.json();

      if (edificiosResult.success) setEdificios(edificiosResult.data);
      if (worldsResult.success) setWorlds(worldsResult.data);
      if (pueblosResult.success) setPueblos(pueblosResult.data);

      // Cargar memorias de edificios en paralelo
      const memoriaPromises = edificiosResult.data.map(edificio => 
        fetch(`/api/edificios/${edificio.id}/memory`)
      );

      const memoriaResponses = await Promise.all(memoriaPromises);
      const memories: Record<string, any> = {};
      memoriaResponses.forEach((response, index) => {
        if (response.ok) {
          const result = response.json();
          if (result.success && result.data.memory) {
            memories[edificiosResult.data[index].id] = result.data.memory;
          }
        }
      });

      setEdificioMemories(memories);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este edificio?')) return;

    try {
      const response = await fetch(`/api/edificios/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Edificio eliminado correctamente'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting edificio:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el edificio',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando edificios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edificios</h2>
          <p className="text-sm text-muted-foreground">Gestiona los edificios y sus resúmenes consolidados</p>
        </div>
        <Button onClick={() => window.location.href = window.location.href = '?create-edificio'}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Edificio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {edificios.map((edificio) => {
          const world = worlds.find(w => w.id === edificio.worldId);
          const pueblo = pueblos.find(p => p.id === edificio.puebloId);

          return (
            <Card key={edificio.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {edificio.name}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = window.location.href = `?edit-edificio?id=${edificio.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(edificio.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardDescription>
                {pueblo?.name || 'Pueblo desconocido'} • {world?.name || 'Mundo desconocido'}
              </CardDescription>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {edificio.lore || 'Sin descripción'}
                    </p>
                  </div>

                  {edificio.eventos_recientes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Eventos Recientes:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {edificio.eventos_recientes.map((evento, i) => (
                          <li key={i}>{evento}</li>
                        ))}
                        {edificio.eventos_recientes.length > 2 && (
                          <li className="text-xs text-muted-foreground">...y {edificio.eventos_recientes.length - 2} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Coordenadas del Área:</p>
                    <p>Inicio: X:{edificio.area.start.x}, Y:{edificio.area.start.y}, Z:{edificio.area.start.z}</p>
                    <p>Fin: X:{edificio.area.end.x}, Y:{edificio.area.end.y}, Z:{edificio.area.end.z}</p>
                  </div>

                  {edificioMemories[edificio.id]?.consolidatedSummary && (
                    <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                        Último Resumen General
                      </p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 line-clamp-3">
                        {edificioMemories[edificio.id].consolidatedSummary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

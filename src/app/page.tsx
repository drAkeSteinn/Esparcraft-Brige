'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, MapPin, Building, Users, MessageSquare, Eye, Network } from 'lucide-react';
import WorldsTab from '@/components/dashboard/WorldsTab';
import PueblosTab from '@/components/dashboard/PueblosTab';
import EdificiosTab from '@/components/dashboard/EdificiosTab';
import NpcsTab from '@/components/dashboard/NpcsTab';
import MapTab from '@/components/dashboard/MapTab';
import SessionsTab from '@/components/dashboard/SessionsTab';
import RouterTab from '@/components/dashboard/RouterTab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('worlds');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bridge IA</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestor Narrativo - Servidor Esparcraft
              </p>
              <p className="text-xs text-muted-foreground">
                Comunidad Tirano Estudios
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Conexión a Text Generation WebUI</p>
              <p className="text-xs">Puerto: 5000 (API OpenAI-compatible)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="worlds" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Mundos</span>
            </TabsTrigger>
            <TabsTrigger value="pueblos" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Pueblos</span>
            </TabsTrigger>
            <TabsTrigger value="edificios" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Edificios</span>
            </TabsTrigger>
            <TabsTrigger value="npcs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">NPCs</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa 2D</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="router" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Router</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="worlds">
            <WorldsTab />
          </TabsContent>

          <TabsContent value="pueblos">
            <PueblosTab />
          </TabsContent>

          <TabsContent value="edificios">
            <EdificiosTab />
          </TabsContent>

          <TabsContent value="npcs">
            <NpcsTab />
          </TabsContent>

          <TabsContent value="map">
            <MapTab />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab />
          </TabsContent>

          <TabsContent value="router">
            <RouterTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Bridge IA - Gestor Narrativo v1.0.0</p>
            <p>Comunidad Tirano Estudios - Servidor Esparcraft</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

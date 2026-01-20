'use client';

import { useState } from 'react';
import { Globe, MapPin, Building, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Subcomponentes
import MundosSection from './mundo/MundosSection';
import PueblosSection from './mundo/PueblosSection';
import EdificiosSection from './mundo/EdificiosSection';
import PlaceTypesSection from './mundo/PlaceTypesSection';

export default function MundoTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Universo</h2>
        <p className="text-muted-foreground">Gestión completa del universo narrativo</p>
      </div>

      <Tabs defaultValue="mundos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="mundos" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Mundos</span>
          </TabsTrigger>
          <TabsTrigger value="pueblos" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Regiones</span>
          </TabsTrigger>
          <TabsTrigger value="edificios" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Edificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="tipos-lugares" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos de Lugares</span>
            <span className="sm:hidden">Tipos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mundos" className="mt-6">
          <MundosSection />
        </TabsContent>

        <TabsContent value="pueblos" className="mt-6">
          <PueblosSection />
        </TabsContent>

        <TabsContent value="edificios" className="mt-6">
          <EdificiosSection />
        </TabsContent>

        <TabsContent value="tipos-lugares" className="mt-6">
          <PlaceTypesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

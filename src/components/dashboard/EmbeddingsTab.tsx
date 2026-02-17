'use client';

import { useState } from 'react';
import { Search, Upload, FileText, Layers, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Subcomponentes
import EmbeddingsStats from './embeddings/EmbeddingsStats';
import EmbeddingsUpload from './embeddings/EmbeddingsUpload';
import EmbeddingsList from './embeddings/EmbeddingsList';
import EmbeddingsSearch from './embeddings/EmbeddingsSearch';
import EmbeddingsNamespaces from './embeddings/EmbeddingsNamespaces';
import EmbeddingsSettings from './embeddings/EmbeddingsSettings';

export default function EmbeddingsTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Embeddings Vectoriales</h2>
        <p className="text-muted-foreground">
          Sistema de búsqueda semántica con LanceDB
        </p>
      </div>

      {/* Stats Overview */}
      <EmbeddingsStats key={`stats-${refreshKey}`} />

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Búsqueda</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Subir</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="namespaces" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Namespaces</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <EmbeddingsSearch key={`search-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <EmbeddingsUpload key={`upload-${refreshKey}`} onUploadComplete={handleRefresh} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <EmbeddingsList key={`list-${refreshKey}`} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="namespaces" className="mt-6">
          <EmbeddingsNamespaces key={`namespaces-${refreshKey}`} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <EmbeddingsSettings key={`settings-${refreshKey}`} onConfigSaved={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

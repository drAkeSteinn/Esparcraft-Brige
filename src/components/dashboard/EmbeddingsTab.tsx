'use client';

import { useState } from 'react';
import { Database, Search, Upload, FileText, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Subcomponentes
import EmbeddingsStats from './embeddings/EmbeddingsStats';
import EmbeddingsUpload from './embeddings/EmbeddingsUpload';
import EmbeddingsList from './embeddings/EmbeddingsList';
import EmbeddingsSearch from './embeddings/EmbeddingsSearch';
import EmbeddingsNamespaces from './embeddings/EmbeddingsNamespaces';

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
          Sistema de búsqueda semántica con PostgreSQL y pgvector
        </p>
      </div>

      {/* Stats Overview */}
      <EmbeddingsStats key={`stats-${refreshKey}`} />

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Búsqueda</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Subir</span>
          </TabsTrigger>
          <TabsTrigger value="namespaces" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Namespaces</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <EmbeddingsList key={`list-${refreshKey}`} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <EmbeddingsSearch key={`search-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <EmbeddingsUpload key={`upload-${refreshKey}`} onUploadComplete={handleRefresh} />
        </TabsContent>

        <TabsContent value="namespaces" className="mt-6">
          <EmbeddingsNamespaces key={`namespaces-${refreshKey}`} onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

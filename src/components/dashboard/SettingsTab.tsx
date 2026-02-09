'use client';

import { useState } from 'react';
import { Settings, Database, Brain, Globe, Server, RefreshCw, CheckCircle, AlertCircle, Save, Palette, Monitor, Users, Bug, FolderOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Subcomponentes
import PostgresConfig from './settings/PostgresConfig';
import EmbeddingsConfig from './settings/EmbeddingsConfig';
import LLMConfig from './settings/LLMConfig';
import ConnectionStatus from './settings/ConnectionStatus';
import ServerConfig from './settings/ServerConfig';
import InterfaceConfig from './settings/InterfaceConfig';
import NPCConfig from './settings/NPCConfig';
import EmbeddingsGlobalConfig from './settings/EmbeddingsGlobalConfig';
import DebugConfig from './settings/DebugConfig';
import SessionConfig from './settings/SessionConfig';
import FilesConfig from './settings/FilesConfig';

export default function SettingsTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuracion</h2>
          <p className="text-muted-foreground">
            Gestiona las conexiones y parametros del sistema
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-2 bg-card border rounded-md hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Connection Status Overview */}
      <ConnectionStatus key={`status-${refreshKey}`} />
      
      <Tabs defaultValue="postgres" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="postgres" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>PostgreSQL</span>
          </TabsTrigger>
          <TabsTrigger value="embeddings" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>Embeddings</span>
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>LLM</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="postgres" className="mt-6">
          <PostgresConfig key={`postgres-${refreshKey}`} onConfigSaved={handleRefresh} />
        </TabsContent>

        <TabsContent value="embeddings" className="mt-6">
          <EmbeddingsConfig key={`embeddings-${refreshKey}`} onConfigSaved={handleRefresh} />
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <LLMConfig key={`llm-${refreshKey}`} onConfigSaved={handleRefresh} />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Tabs defaultValue="server" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
              <TabsTrigger value="server" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span>Servidor</span>
              </TabsTrigger>
              <TabsTrigger value="interface" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Interfaz</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>Sesiones</span>
              </TabsTrigger>
              <TabsTrigger value="npcs" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>NPCs</span>
              </TabsTrigger>
              <TabsTrigger value="embeddings-global" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Embeddings</span>
              </TabsTrigger>
              <TabsTrigger value="debug" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                <span>Debug</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span>Archivos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="server" className="mt-6">
              <ServerConfig key={`server-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="interface" className="mt-6">
              <InterfaceConfig key={`interface-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <SessionConfig key={`sessions-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="npcs" className="mt-6">
              <NPCConfig key={`npcs-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="embeddings-global" className="mt-6">
              <EmbeddingsGlobalConfig key={`embeddings-global-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="debug" className="mt-6">
              <DebugConfig key={`debug-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <FilesConfig key={`files-${refreshKey}`} onConfigSaved={handleRefresh} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

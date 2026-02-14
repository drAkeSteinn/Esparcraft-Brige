/**
 * INTEGRACIÓN DE EMBEDDINGS EN ROUTERTAB
 * =======================================
 * 
 * Este archivo muestra cómo integrar el componente EmbeddingSwitcher
 * en cada sección del RouterTab.
 */

// ============================================
// 1. IMPORTS A AGREGAR EN ROUTERTAB.TSX
// ============================================

/*
import EmbeddingSwitcher from '@/components/dashboard/EmbeddingSwitcher';
import { useRouterEmbeddings } from '@/hooks/useRouterEmbeddings';
import type { EmbeddingContext } from '@/lib/types';
*/

// ============================================
// 2. ESTADOS PARA EMBEDDINGS
// ============================================

/*
// Agregar después de los estados existentes

// Embedding configs for each trigger
const [chatEmbeddingConfig, setChatEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'chat-context',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: false,
  relatedNamespaces: []
});

const [resumenSesionEmbeddingConfig, setResumenSesionEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'session-summaries',
  maxResults: 3,
  threshold: 0.75,
  includeRelated: false,
  relatedNamespaces: []
});

const [resumenNPCEmbeddingConfig, setResumenNPCEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'npc-summaries',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: true,
  relatedNamespaces: ['session-summaries']
});

const [resumenEdificioEmbeddingConfig, setResumenEdificioEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'edificio-context',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: true,
  relatedNamespaces: ['npc-summaries']
});

const [resumenPuebloEmbeddingConfig, setResumenPuebloEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'pueblo-context',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: true,
  relatedNamespaces: ['edificio-context', 'npc-summaries']
});

const [resumenMundoEmbeddingConfig, setResumenMundoEmbeddingConfig] = useState({
  enabled: false,
  namespace: 'mundo-context',
  maxResults: 5,
  threshold: 0.7,
  includeRelated: true,
  relatedNamespaces: ['pueblo-context', 'edificio-context', 'npc-summaries']
});

// Embedding results for preview
const [chatEmbeddingResults, setChatEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
const [resumenSesionEmbeddingResults, setResumenSesionEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
const [resumenNPCEmbeddingResults, setResumenNPCEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
const [resumenEdificioEmbeddingResults, setResumenEdificioEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
const [resumenPuebloEmbeddingResults, setResumenPuebloEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
const [resumenMundoEmbeddingResults, setResumenMundoEmbeddingResults] = useState<EmbeddingSearchResult[]>([]);
*/

// ============================================
// 3. FUNCIÓN PARA BUSCAR EMBEDDINGS
// ============================================

/*
const searchEmbeddings = async (
  query: string,
  config: EmbeddingTriggerConfig,
  setResults: (results: EmbeddingSearchResult[]) => void
) => {
  if (!config.enabled || !query || query.trim().length < 3) {
    setResults([]);
    return;
  }

  try {
    const response = await fetch('/api/search/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        namespace: config.namespace,
        limit: config.maxResults,
        threshold: config.threshold
      })
    });

    const data = await response.json();
    
    if (data.success && data.data?.results) {
      setResults(data.data.results);
    } else {
      setResults([]);
    }
  } catch (error) {
    console.error('Error searching embeddings:', error);
    setResults([]);
  }
};
*/

// ============================================
// 4. FUNCIÓN PARA FORMATEAR EMBEDDINGS
// ============================================

/*
const formatEmbeddingsForPrompt = (results: EmbeddingSearchResult[]): string => {
  if (!results || results.length === 0) return '';
  
  return `---
CONTEXTO RELEVANTE (embeddings):
${results.map((r, i) => `${i + 1}. [${r.namespace}] ${r.content}`).join('\n')}
---`;
};
*/

// ============================================
// 5. EJEMPLO DE USO EN CHAT TRIGGER
// ============================================

/*
// Agregar después de la card de configuración del chat:

<EmbeddingSwitcher
  enabled={chatEmbeddingConfig.enabled}
  onToggle={(enabled) => setChatEmbeddingConfig(prev => ({ ...prev, enabled }))}
  namespace={`chat-npc-${chatForm.npcid || 'default'}`}
  config={chatEmbeddingConfig}
  onConfigChange={setChatEmbeddingConfig}
  previewQuery={chatForm.mensaje}
  showPreview={true}
  label="Contexto de Embeddings"
  description="Buscar información relevante del NPC"
/>
*/

// ============================================
// 6. MODIFICAR buildChatPayload
// ============================================

/*
const buildChatPayload = () => {
  const npc = npcs.find(n => n.id === chatForm.npcid);
  if (!npc) return null;

  const world = worlds.find(w => w.id === npc.location?.worldId);
  const pueblo = pueblos.find(p => p.id === npc.location?.puebloId);
  const edificio = edificios.find(e => e.id === npc.location?.edificioId);

  let playersessionid = chatForm.playersessionid;
  if (chatForm.sessionType === 'new') {
    playersessionid = undefined;
  }

  // Preparar contexto de embeddings
  const embeddingContext: EmbeddingContext | undefined = chatEmbeddingConfig.enabled
    ? {
        enabled: true,
        results: chatEmbeddingResults,
        formattedContext: formatEmbeddingsForPrompt(chatEmbeddingResults)
      }
    : undefined;

  return {
    mode: 'chat',
    npcid: chatForm.npcid,
    playersessionid,
    jugador: chatForm.jugador,
    message: chatForm.mensaje,
    lastSummary: chatForm.lastSummary,
    context: {
      mundo: world,
      pueblo,
      edificio
    },
    // NUEVO: Agregar embeddings
    embeddings: embeddingContext
  };
};
*/

// ============================================
// 7. EFECTO PARA BUSCAR EMBEDDINGS EN CHAT
// ============================================

/*
// Agregar useEffect para buscar embeddings cuando cambia el mensaje

useEffect(() => {
  if (chatEmbeddingConfig.enabled && chatForm.mensaje) {
    const timeoutId = setTimeout(() => {
      searchEmbeddings(
        chatForm.mensaje,
        chatEmbeddingConfig,
        setChatEmbeddingResults
      );
    }, 500);
    
    return () => clearTimeout(timeoutId);
  } else {
    setChatEmbeddingResults([]);
  }
}, [chatForm.mensaje, chatEmbeddingConfig]);
*/

// ============================================
// 8. MOSTRAR EMBEDDINGS EN PREVIEW
// ============================================

/*
// Agregar sección en el visualizador de prompt:

{chatEmbeddingConfig.enabled && chatEmbeddingResults.length > 0 && (
  <div className="rounded-lg border bg-purple-500/10 border-purple-500/30">
    <div className="border-b border-black/10 dark:border-white/10 bg-purple-500/20 px-3 py-2">
      <span className="text-sm font-semibold text-purple-400">
        🧠 Contexto de Embeddings ({chatEmbeddingResults.length} resultados)
      </span>
    </div>
    <pre className="text-sm p-4 whitespace-pre-wrap overflow-x-auto">
      {formatEmbeddingsForPrompt(chatEmbeddingResults)}
    </pre>
  </div>
)}
*/

// ============================================
// 9. EJEMPLO COMPLETO PARA RESUMEN SESIÓN
// ============================================

/*
// En TabsContent value="resumen_sesion":

<EmbeddingSwitcher
  enabled={resumenSesionEmbeddingConfig.enabled}
  onToggle={(enabled) => setResumenSesionEmbeddingConfig(prev => ({ ...prev, enabled }))}
  namespace="session-summaries"
  config={resumenSesionEmbeddingConfig}
  onConfigChange={setResumenSesionEmbeddingConfig}
  previewQuery={resumenSesionForm.lastSummary}
  showPreview={true}
  label="Contexto de Resúmenes Previos"
  description="Buscar en resúmenes de sesiones anteriores"
/>
*/

// ============================================
// 10. EJEMPLO PARA RESUMEN NPC
// ============================================

/*
// En TabsContent value="resumen_npc":

<EmbeddingSwitcher
  enabled={resumenNPCEmbeddingConfig.enabled}
  onToggle={(enabled) => setResumenNPCEmbeddingConfig(prev => ({ ...prev, enabled }))}
  namespace={`npc-${resumenNPCForm.npcid || 'default'}`}
  config={resumenNPCEmbeddingConfig}
  onConfigChange={setResumenNPCEmbeddingConfig}
  previewQuery={resumenNPCForm.allSummaries?.substring(0, 500)}
  showPreview={true}
  label="Memoria Vectorial del NPC"
  description="Buscar patrones en resúmenes del NPC"
/>
*/

// ============================================
// NOTAS DE IMPLEMENTACIÓN
// ============================================

/*
PASOS PARA INTEGRAR:

1. Importar componentes necesarios al inicio del archivo RouterTab.tsx

2. Agregar estados para cada configuración de embedding (6 triggers)

3. Agregar estados para resultados de embeddings (6 triggers)

4. Agregar la función searchEmbeddings()

5. Agregar la función formatEmbeddingsForPrompt()

6. Agregar useEffect para cada trigger que busque embeddings cuando cambie el query

7. Modificar cada buildPayload() para incluir embeddings

8. Agregar EmbeddingSwitcher en cada TabsContent

9. Agregar visualización de embeddings en cada preview

NAMESPACES RECOMENDADOS:
- chat: chat-npc-{npcId}
- resumen_sesion: session-summaries
- resumen_npc: npc-{npcId}
- resumen_edificio: edificio-{edificioId}
- resumen_pueblo: pueblo-{puebloId}
- resumen_mundo: mundo-{mundoId}
*/

export {};

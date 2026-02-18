import { NextRequest, NextResponse } from 'next/server';
import { handleTrigger } from '@/lib/triggerHandlers';
import { AnyTriggerPayload, ChatTriggerPayload } from '@/lib/types';
import { chatQueue } from '@/lib/chatQueue';

/**
 * API Endpoint para Denizen
 * Recibe peticiones HTTP de scripts de Denizen y ejecuta los triggers correspondientes
 * 
 * ⚠️ MODO CHAT: Usa sistema de cola para procesamiento secuencial
 * Otros modos: Ejecución directa (sin cola)
 * 
 * Formato de petición esperado (chat):
 * {
 *   "mode": "chat",
 *   "npcid": "NPC_1768825922617",
 *   "playersessionid": "sesion_1234567890",
 *   "message": "hola, ¿cómo estás?",
 *   "jugador": {
 *     "nombre": "drAke",
 *     "raza": "Humano",
 *     "nivel": "10",
 *     "almakos": "1000",
 *     "deuda": "100",
 *     "piedras_del_alma": "5",
 *     "salud_actual": "10",
 *     "reputacion": "6",
 *     "hora": "10:30pm",
 *     "clima": "soleado"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate basic payload structure
    if (!body.mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 }
      );
    }

    const payload = body as AnyTriggerPayload;

    // 🔄 MODO CHAT: Usar cola de procesamiento
    if (payload.mode === 'chat') {
      return await handleChatWithQueue(payload as ChatTriggerPayload);
    }

    // ⚡ OTROS MODOS: Ejecución directa (sin cola)
    const result = await handleTrigger(payload);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in /api/v1:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * Maneja requests de chat usando la cola
 * 
 * Comportamiento:
 * - Agrega el request a la cola
 * - Espera a que se procese (polling)
 * - Retorna el resultado cuando esté listo
 */
async function handleChatWithQueue(payload: ChatTriggerPayload): Promise<NextResponse> {
  // Asegurar que la cola está inicializada
  await chatQueue.initialize();

  // Agregar a la cola
  const { queueId, position } = await chatQueue.enqueue(payload);

  console.log(`[API] Chat request encolado. ID: ${queueId}, Posición: ${position}`);

  // Esperar resultado con timeout
  const maxWaitTime = 180000; // 3 minutos máximo
  const pollInterval = 500; // 500ms entre verificaciones
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const item = chatQueue.getStatus(queueId);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Request not found in queue' },
        { status: 404 }
      );
    }

    // Completado exitosamente
    if (item.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: item.result,
        queueInfo: {
          id: queueId,
          waitedMs: Date.now() - startTime,
          processingTimeMs: item.completedAt && item.startedAt 
            ? new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()
            : undefined
        }
      });
    }

    // Falló
    if (item.status === 'failed') {
      return NextResponse.json(
        {
          success: false,
          error: item.error || 'Request failed',
          queueInfo: {
            id: queueId,
            retryCount: item.retryCount
          }
        },
        { status: 500 }
      );
    }

    // Esperar antes del siguiente poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout esperando resultado
  return NextResponse.json(
    {
      success: false,
      error: 'Timeout waiting for queue processing',
      queueInfo: {
        id: queueId,
        position: chatQueue.getPendingItems().findIndex(i => i.id === queueId) + 1,
        status: 'waiting'
      }
    },
    { status: 504 } // Gateway Timeout
  );
}

// Health check endpoint
export async function GET() {
  const queueStats = chatQueue.getStats();
  
  return NextResponse.json({
    status: 'ok',
    service: 'Bridge IA - Denizen API',
    version: '1.1.0',
    modes: ['chat', 'resumen_sesion', 'resumen_npc', 'resumen_edificio', 'resumen_pueblo', 'resumen_mundo', 'nuevo_lore'],
    queue: {
      enabled: true,
      stats: queueStats
    }
  });
}

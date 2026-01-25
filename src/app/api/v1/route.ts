import { NextRequest, NextResponse } from 'next/server';
import { handleTrigger } from '@/lib/triggerHandlers';
import { AnyTriggerPayload } from '@/lib/types';

/**
 * API Endpoint para Denizen
 * Recibe peticiones HTTP de scripts de Denizen y ejecuta los triggers correspondientes
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

    // Execute the trigger
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

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Bridge IA - Denizen API',
    version: '1.0.0',
    modes: ['chat', 'resumen_sesion', 'resumen_npc', 'resumen_edificio', 'resumen_pueblo', 'resumen_mundo', 'nuevo_lore']
  });
}

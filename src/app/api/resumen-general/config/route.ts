import { NextRequest, NextResponse } from 'next/server';
import { getSessionConfig, updateSessionConfig } from '@/lib/sessionConfig';

/**
 * GET /api/resumen-general/config
 * Obtiene la configuración actual del resumen general.
 *
 * NOTA: minMessages y keepMessages ahora viven en sessionConfig (unificado
 * en la pestaña Sesiones → Configuración). Este endpoint sigue retornando
 * minMessages para compatibilidad con componentes legacy, pero el source
 * of truth es getSessionConfig().
 */
export async function GET() {
  try {
    const sessionCfg = getSessionConfig();
    return NextResponse.json({
      success: true,
      data: {
        minMessages: sessionCfg.minMessagesToSummarize,
        keepMessages: sessionCfg.keepMessagesAfterSummary,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/resumen-general/config:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resumen-general/config
 * Actualiza la configuración del resumen general.
 *
 * Body:
 *   - minMessages: mínimo de mensajes para resumir sesión
 *   - keepMessages: mensajes a conservar al hacer el resumen
 *
 * Ambos se persisten en sessionConfig (memoria del proceso).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updates: any = {};

    if (body.minMessages !== undefined) {
      const min = Number(body.minMessages);
      if (!Number.isFinite(min) || min < 1 || min > 1000) {
        return NextResponse.json(
          { error: 'minMessages debe ser un número entre 1 y 1000' },
          { status: 400 }
        );
      }
      updates.minMessagesToSummarize = min;
    }

    if (body.keepMessages !== undefined) {
      const keep = Number(body.keepMessages);
      if (!Number.isFinite(keep) || keep < 0 || keep > 1000) {
        return NextResponse.json(
          { error: 'keepMessages debe ser un número entre 0 y 1000' },
          { status: 400 }
        );
      }
      updates.keepMessagesAfterSummary = keep;
    }

    updateSessionConfig(updates);
    const newCfg = getSessionConfig();

    return NextResponse.json({
      success: true,
      data: {
        minMessages: newCfg.minMessagesToSummarize,
        keepMessages: newCfg.keepMessagesAfterSummary,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/resumen-general/config:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


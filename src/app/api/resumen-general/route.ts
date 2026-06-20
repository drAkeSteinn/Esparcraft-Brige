import { NextRequest, NextResponse } from 'next/server';
import { ResumenGeneralService, ResumenGeneralConfig } from '@/lib/resumenGeneralService';

/**
 * POST /api/resumen-general
 * Inicia el resumen general en background
 * 
 * Body:
 * {
 *   minMessages: number,
 *   phases: {
 *     sesiones: boolean,
 *     npcs: boolean,
 *     edificios: boolean,
 *     pueblos: boolean,
 *     mundos: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minMessages, phases } = body;

    // Validar
    if (typeof minMessages !== 'number' || minMessages < 1) {
      return NextResponse.json({
        success: false,
        error: 'minMessages debe ser un número mayor o igual a 1'
      }, { status: 400 });
    }

    if (!phases || typeof phases !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'phases debe ser un objeto con booleanos'
      }, { status: 400 });
    }

    // Verificar si ya está corriendo
    const isRunning = await ResumenGeneralService.isRunning();
    if (isRunning) {
      return NextResponse.json({
        success: false,
        error: 'Resumen general ya está en ejecución'
      }, { status: 400 });
    }

    // Configurar validación
    const config: ResumenGeneralConfig = {
      minMessages,
      phases: {
        sesiones: !!phases.sesiones,
        npcs: !!phases.npcs,
        edificios: !!phases.edificios,
        pueblos: !!phases.pueblos,
        mundos: !!phases.mundos
      }
    };

    // ✅ MARCAR COMO RUNNING EN DB
    await ResumenGeneralService.setRunning(config);

    // ✅ EJECUTAR EN BACKGROUND (sin await)
    ResumenGeneralService.execute(config)
      .then((results) => {
        console.log('[ResumenGeneral API] Completado exitosamente:', results);
      })
      .catch((error) => {
        console.error('[ResumenGeneral API] Error:', error);
        ResumenGeneralService.setError(error);
      });

    // ✅ RESPUESTA INMEDIATA (no esperar a que termine)
    return NextResponse.json({
      success: true,
      message: 'Resumen general iniciado en background',
      status: 'running'
    });

  } catch (error) {
    console.error('Error in POST /api/resumen-general:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

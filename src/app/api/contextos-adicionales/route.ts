import { NextRequest, NextResponse } from 'next/server';
import { contextoAdicionalManager, normalizeEntityType } from '@/lib/contextoAdicionalManager';

/**
 * GET /api/contextos-adicionales?entityType=npc&entityId=NPC_123
 * Obtiene los contextos adicionales activos (no expirados) de una entidad.
 * Si se pasa ?includeExpired=true, incluye también los expirados.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const includeExpired = searchParams.get('includeExpired') === 'true';

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros entityType y entityId' },
        { status: 400 }
      );
    }

    const normalizedType = normalizeEntityType(entityType);
    const contexts = includeExpired
      ? await contextoAdicionalManager.getAll(normalizedType, entityId)
      : await contextoAdicionalManager.getActive(normalizedType, entityId);

    return NextResponse.json({
      success: true,
      data: contexts,
      count: contexts.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo contextos adicionales:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contextos-adicionales
 * Crea o actualiza un contexto adicional.
 * Si ya existe (misma entidad + mismo target), actualiza la duración.
 *
 * Body:
 * {
 *   entityType: 'npc' | 'edificio' | 'pueblo' | 'mundo',
 *   entityId: string,
 *   targetType: 'npc' | 'edificio' | 'pueblo' | 'mundo',
 *   targetId: string,
 *   durationDays: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.entityType || !body.entityId || !body.targetType || !body.targetId || !body.durationDays) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: entityType, entityId, targetType, targetId, durationDays' },
        { status: 400 }
      );
    }

    const entityType = normalizeEntityType(body.entityType);
    const targetType = normalizeEntityType(body.targetType);
    const durationDays = parseInt(body.durationDays, 10);

    if (isNaN(durationDays) || durationDays < 1) {
      return NextResponse.json(
        { error: 'durationDays debe ser un número entero positivo' },
        { status: 400 }
      );
    }

    const contexto = await contextoAdicionalManager.upsert({
      entityType,
      entityId: body.entityId,
      targetType,
      targetId: body.targetId,
      durationDays,
    });

    return NextResponse.json({
      success: true,
      data: contexto,
      message: `Contexto creado: ${entityType}:${body.entityId} → ${targetType}:${body.targetId} (${durationDays} días)`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creando contexto adicional:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

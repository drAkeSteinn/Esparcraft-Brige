import { NextRequest, NextResponse } from 'next/server';
import { namespaceManager, buildNamespace, type EntityType } from '@/lib/namespaceManager';

/**
 * GET /api/embeddings/namespace-hierarchy?entityType=npc&entityId=NPC_123
 *
 * Retorna la jerarquía completa de namespaces para una entidad dada,
 * del más específico al más general.
 *
 * Ej: para una sesión → [sesion:X, npc:Y, edificio:Z, pueblo:W, mundo:V]
 *
 * También asegura que todos los namespaces de la jerarquía existan.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as EntityType | null;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros entityType y entityId' },
        { status: 400 }
      );
    }

    if (!['mundo', 'pueblo', 'edificio', 'npc', 'sesion'].includes(entityType)) {
      return NextResponse.json(
        { error: `entityType inválido. Debe ser: mundo, pueblo, edificio, npc o sesion` },
        { status: 400 }
      );
    }

    // Asegurar que toda la jerarquía tenga namespaces
    try {
      await namespaceManager.ensureForEntity(entityType, entityId);
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message },
        { status: 404 }
      );
    }

    const hierarchy = await namespaceManager.getNamespaceHierarchy(entityType, entityId);

    // Para cada namespace de la jerarquía, obtener info detallada
    const hierarchyInfo = await Promise.all(
      hierarchy.map(async (ns) => {
        const parsed = ns.split(':');
        const type = parsed[0] as EntityType;
        const id = parsed[1];
        const embeddingsCount = await namespaceManager.countEmbeddings(ns);
        return {
          namespace: ns,
          entityType: type,
          entityId: id,
          embeddingsCount,
          exists: true,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        entityType,
        entityId,
        hierarchy: hierarchyInfo,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo jerarquía:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener jerarquía' },
      { status: 500 }
    );
  }
}

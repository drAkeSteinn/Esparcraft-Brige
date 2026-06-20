import { NextRequest, NextResponse } from 'next/server';
import { namespaceManager } from '@/lib/namespaceManager';

/**
 * POST /api/embeddings/verify-namespace
 *
 * Verifica que todas las sesiones, NPCs, edificios, pueblos y mundos
 * tengan su propio namespace registrado en la tabla `namespaces`.
 * Si alguno no lo tiene, lo crea automáticamente.
 *
 * Body opcional:
 * {
 *   entityType?: 'mundo' | 'pueblo' | 'edificio' | 'npc' | 'sesion',  // si se especifica, solo verifica ese tipo
 *   entityId?: string                                                  // si se especifica, solo verifica esa entidad
 * }
 *
 * Si no se envía body, verifica TODAS las entidades.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Caso 1: verificar entidad específica
    if (body.entityType && body.entityId) {
      try {
        const result = await namespaceManager.ensureForEntity(body.entityType, body.entityId);
        return NextResponse.json({
          success: true,
          data: {
            message: result.created
              ? `Namespace creado: ${result.namespace}`
              : `Namespace ya existía: ${result.namespace}`,
            namespace: result.namespace,
            created: result.created,
            parentNamespace: result.parentNamespace,
          },
        });
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    // Caso 2: verificar todas las entidades
    const result = await namespaceManager.verifyAll();

    // Si se solicita limpiar huérfanos, hacerlo
    let cleanResults: Array<{ namespace: string; deleted: boolean; error?: string }> = [];
    if (body.cleanOrphans === true && result.orphanedNamespaces.length > 0) {
      console.log(`[verify-namespace] Limpiando ${result.orphanedNamespaces.length} namespace(s) huérfano(s)...`);
      cleanResults = await namespaceManager.cleanOrphanedNamespaces(
        result.orphanedNamespaces.map((o) => ({
          namespace: o.namespace,
          entityType: o.entityType,
          entityId: o.entityId,
        }))
      );

      // Actualizar el resultado con los huérfanos eliminados
      result.orphanedNamespaces = result.orphanedNamespaces.map((o) => {
        const cleaned = cleanResults.find((c) => c.namespace === o.namespace);
        return {
          ...o,
          deleted: cleaned?.deleted ?? false,
          error: cleaned?.error,
        };
      });
      result.orphanedDeleted = cleanResults.filter((c) => c.deleted).length;
      result.orphanedErrors = cleanResults.filter((c) => !c.deleted).length;
    }

    const orphanMsg = result.orphanedCount > 0
      ? ` · ${result.orphanedCount} huérfanos${body.cleanOrphans ? ` (${result.orphanedDeleted} eliminados, ${result.orphanedErrors} errores)` : ' detectados'}`
      : '';

    return NextResponse.json({
      success: true,
      data: {
        message: `Verificación completada: ${result.totalEntities} entidades, ${result.created} namespaces creados, ${result.verified} ya existían, ${result.errors} errores${orphanMsg}.`,
        ...result,
      },
    });
  } catch (error: any) {
    console.error('Error verificando namespaces:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al verificar namespaces' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings/verify-namespace
 * Lista todos los namespaces agrupados por tipo de entidad.
 */
export async function GET() {
  try {
    const grouped = await namespaceManager.listAllByType();

    const counts = {
      mundo: grouped.mundo.length,
      pueblo: grouped.pueblo.length,
      edificio: grouped.edificio.length,
      npc: grouped.npc.length,
      sesion: grouped.sesion.length,
    };
    const total = counts.mundo + counts.pueblo + counts.edificio + counts.npc + counts.sesion;

    return NextResponse.json({
      success: true,
      data: {
        total,
        counts,
        namespaces: grouped,
      },
    });
  } catch (error: any) {
    console.error('Error listando namespaces:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al listar namespaces' },
      { status: 500 }
    );
  }
}

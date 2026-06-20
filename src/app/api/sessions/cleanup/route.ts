import { NextRequest, NextResponse } from 'next/server';
import { sessionDbManager } from '@/lib/sessionDbManager';
import { getSessionConfig } from '@/lib/sessionConfig';

/**
 * GET /api/sessions/cleanup
 * Lista las sesiones inactivas según el inactivityTimeout configurado.
 *
 * Query params opcionales:
 *   - timeoutSeconds: si se proporciona, sobreescribe el inactivityTimeout de la config
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customTimeout = searchParams.get('timeoutSeconds');
    const timeoutSeconds = customTimeout
      ? parseInt(customTimeout, 10)
      : getSessionConfig().inactivityTimeout;

    if (isNaN(timeoutSeconds) || timeoutSeconds < 1) {
      return NextResponse.json(
        { error: 'timeoutSeconds debe ser un número positivo' },
        { status: 400 }
      );
    }

    const inactiveSessions = await sessionDbManager.getInactiveSessions(timeoutSeconds);

    return NextResponse.json({
      success: true,
      data: {
        timeoutSeconds,
        cutoff: new Date(Date.now() - timeoutSeconds * 1000).toISOString(),
        count: inactiveSessions.length,
        sessions: inactiveSessions.map((s) => ({
          id: s.id,
          npcId: s.npcId,
          playerId: s.playerId,
          lastActivity: s.lastActivity,
          messagesCount: s.messages.length,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error listing inactive sessions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al listar sesiones inactivas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/cleanup
 * Elimina las sesiones inactivas según el inactivityTimeout configurado.
 *
 * Body opcional:
 *   - timeoutSeconds: si se proporciona, sobreescribe el inactivityTimeout de la config
 *
 * Retorna el número de sesiones eliminadas.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customTimeout = body.timeoutSeconds;
    const timeoutSeconds =
      typeof customTimeout === 'number' && customTimeout > 0
        ? customTimeout
        : getSessionConfig().inactivityTimeout;

    // Primero listar cuántas se van a eliminar (para reporting)
    const beforeList = await sessionDbManager.getInactiveSessions(timeoutSeconds);
    const beforeCount = beforeList.length;

    // Eliminar
    const deletedCount = await sessionDbManager.cleanInactiveSessions(timeoutSeconds);

    return NextResponse.json({
      success: true,
      data: {
        timeoutSeconds,
        cutoff: new Date(Date.now() - timeoutSeconds * 1000).toISOString(),
        beforeCount,
        deletedCount,
        message:
          deletedCount > 0
            ? `${deletedCount} sesión(es) inactiva(s) eliminada(s) (inactivas por más de ${timeoutSeconds}s)`
            : 'No había sesiones inactivas para eliminar',
      },
    });
  } catch (error: any) {
    console.error('Error cleaning inactive sessions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al limpiar sesiones inactivas' },
      { status: 500 }
    );
  }
}

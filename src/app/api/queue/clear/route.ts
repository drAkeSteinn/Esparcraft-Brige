import { NextRequest, NextResponse } from 'next/server';
import { chatQueue } from '@/lib/chatQueue';

/**
 * POST /api/queue/clear
 * Limpia la cola de chat
 * 
 * Body:
 * - mode: 'completed' | 'all' (default: 'completed')
 *   - 'completed': Solo limpia items completados/fallidos
 *   - 'all': Limpia toda la cola (incluye pendientes)
 */
export async function POST(request: NextRequest) {
  try {
    await chatQueue.initialize();
    
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'completed';

    if (mode === 'all') {
      await chatQueue.clearAll();
      return NextResponse.json({
        success: true,
        message: 'Queue cleared completely',
        stats: chatQueue.getStats()
      });
    } else {
      const removed = await chatQueue.clearCompleted();
      return NextResponse.json({
        success: true,
        message: `Removed ${removed} completed/failed items`,
        stats: chatQueue.getStats()
      });
    }
  } catch (error) {
    console.error('Error clearing queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear queue' },
      { status: 500 }
    );
  }
}

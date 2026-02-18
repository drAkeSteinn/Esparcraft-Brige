import { NextResponse } from 'next/server';
import { chatQueue } from '@/lib/chatQueue';

/**
 * GET /api/queue/status
 * Obtiene el estado actual de la cola de chat
 */
export async function GET() {
  try {
    await chatQueue.initialize();
    
    const stats = chatQueue.getStats();
    const items = chatQueue.getAllItems();
    const pending = chatQueue.getPendingItems();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        pendingCount: pending.length,
        totalItems: items.length,
        pendingItems: pending.map(item => ({
          id: item.id,
          npcId: item.payload.npcid,
          playerSessionId: item.payload.playersessionid,
          message: item.payload.message?.substring(0, 50) + '...',
          addedAt: item.addedAt,
          retryCount: item.retryCount
        })),
        recentCompleted: items
          .filter(i => i.status === 'completed')
          .slice(-5)
          .map(item => ({
            id: item.id,
            npcId: item.payload.npcid,
            completedAt: item.completedAt,
            processingTimeMs: item.completedAt && item.startedAt
              ? new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()
              : undefined
          })),
        recentFailed: items
          .filter(i => i.status === 'failed')
          .slice(-5)
          .map(item => ({
            id: item.id,
            npcId: item.payload.npcid,
            error: item.error,
            completedAt: item.completedAt
          }))
      }
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

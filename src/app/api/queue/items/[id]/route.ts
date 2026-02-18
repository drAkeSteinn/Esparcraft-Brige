import { NextRequest, NextResponse } from 'next/server';
import { chatQueue } from '@/lib/chatQueue';

/**
 * GET /api/queue/items/[id]
 * Obtiene el estado de un item específico en la cola
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await chatQueue.initialize();
    
    const { id } = await params;
    const item = chatQueue.getStatus(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        status: item.status,
        addedAt: item.addedAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        retryCount: item.retryCount,
        error: item.error,
        npcId: item.payload.npcid,
        playerSessionId: item.payload.playersessionid,
        messagePreview: item.payload.message?.substring(0, 100),
        result: item.status === 'completed' ? item.result : undefined,
        processingTimeMs: item.completedAt && item.startedAt
          ? new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()
          : undefined
      }
    });
  } catch (error) {
    console.error('Error getting queue item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue item' },
      { status: 500 }
    );
  }
}

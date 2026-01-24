import { NextRequest, NextResponse } from 'next/server';
import { sessionManager, summaryManager } from '@/lib/fileManager';

// GET NPC session summaries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all sessions for this NPC
    const sessions = sessionManager.getByNPCId(id);

    // Get summaries for each session
    const sessionsWithSummaries = sessions
      .map(session => {
        const summary = summaryManager.getSummary(session.id);
        return {
          sessionId: session.id,
          startTime: session.startTime,
          lastActivity: session.lastActivity,
          messageCount: session.messages.length,
          summary: summary || null
        };
      })
      .filter(s => s.summary !== null); // Solo incluir sesiones con resumen

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsWithSummaries
      }
    });
  } catch (error) {
    console.error('Error fetching NPC session summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NPC session summaries' },
      { status: 500 }
    );
  }
}

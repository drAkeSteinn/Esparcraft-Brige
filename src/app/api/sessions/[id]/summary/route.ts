import { NextRequest, NextResponse } from 'next/server';
import { summaryManager } from '@/lib/fileManager';

// GET summary for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = summaryManager.getSummary(id);

    if (summary === null) {
      return NextResponse.json({
        success: true,
        data: { summary: null }
      });
    }

    return NextResponse.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('Error fetching session summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session summary' },
      { status: 500 }
    );
  }
}

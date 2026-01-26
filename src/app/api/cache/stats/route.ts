'use server';

import { NextRequest, NextResponse } from 'next/server';
import { templateCache } from '@/lib/templateCache';

export async function GET() {
  try {
    const stats = templateCache.getStats();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cache stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    templateCache.invalidateAll();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

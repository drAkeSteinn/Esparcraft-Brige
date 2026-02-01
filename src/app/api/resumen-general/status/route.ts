import { NextRequest, NextResponse } from 'next/server';
import { ResumenGeneralService } from '@/lib/resumenGeneralService';

/**
 * GET /api/resumen-general/status
 * Obtiene el estado actual del resumen general
 */
export async function GET() {
  try {
    const status = await ResumenGeneralService.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in GET /api/resumen-general/status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

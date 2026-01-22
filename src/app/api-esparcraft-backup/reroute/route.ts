import { NextRequest, NextResponse } from 'next/server';
import { handleTrigger, previewTriggerPrompt } from '@/lib/triggerHandlers';
import { AnyTriggerPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Get preview flag from query
    const preview = request.nextUrl.searchParams.get('preview') === 'true';

    const body = await request.json();

    // Validate basic payload structure
    if (!body.mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 }
      );
    }

    const payload = body as AnyTriggerPayload;

    // If preview mode, return prompt preview without calling LLM
    if (preview) {
      try {
        const previewData = await previewTriggerPrompt(payload);
        return NextResponse.json({
          success: true,
          preview: true,
          data: previewData
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Preview error: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Execute the trigger
    const result = await handleTrigger(payload);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in /api/reroute:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Bridge IA - Gestor Narrativo',
    version: '1.0.0',
    modes: ['chat', 'resumen_sesion', 'resumen_npc', 'nuevo_lore']
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { npcDbManager } from '@/lib/npcDbManager';

/**
 * GET /api/npcs/[id]/json-config
 * Obtiene la configuración JSON del NPC
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const npc = await npcDbManager.getById(id);
    if (!npc) {
      return NextResponse.json(
        { success: false, error: `NPC with id ${id} not found` },
        { status: 404 }
      );
    }

    // Obtener configuración JSON de extensions
    const extensions = npc?.card?.data?.extensions || {};
    const jsonResponse = extensions.jsonResponse || {
      enabled: false,
      schema: null,
      exampleResponse: null,
      fallbackResponse: null,
      correctionPrompt: null,
      maxRetries: 2
    };

    return NextResponse.json({
      success: true,
      data: jsonResponse
    });
  } catch (error) {
    console.error('[GET /api/npcs/[id]/json-config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/npcs/[id]/json-config
 * Guarda la configuración JSON del NPC
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const npc = await npcDbManager.getById(id);
    if (!npc) {
      return NextResponse.json(
        { success: false, error: `NPC with id ${id} not found` },
        { status: 404 }
      );
    }

    // Validar estructura de la configuración
    const jsonConfig = {
      enabled: body.enabled ?? false,
      schema: body.schema || null,
      exampleResponse: body.exampleResponse || null,
      fallbackResponse: body.fallbackResponse || null,
      correctionPrompt: body.correctionPrompt || null,
      maxRetries: body.maxRetries ?? 2
    };

    // Actualizar extensions en la card
    const updatedCard = {
      ...npc.card,
      data: {
        ...npc.card.data,
        extensions: {
          ...(npc.card.data?.extensions || {}),
          jsonResponse: jsonConfig
        }
      }
    };

    // Guardar en la base de datos
    const updated = await npcDbManager.updateCard(id, updatedCard);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update NPC' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: jsonConfig,
      message: 'JSON config saved successfully'
    });
  } catch (error) {
    console.error('[POST /api/npcs/[id]/json-config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/npcs/[id]/json-config
 * Desactiva/elimina la configuración JSON del NPC
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const npc = await npcDbManager.getById(id);
    if (!npc) {
      return NextResponse.json(
        { success: false, error: `NPC with id ${id} not found` },
        { status: 404 }
      );
    }

    // Eliminar jsonResponse de extensions
    const extensions = { ...(npc.card.data?.extensions || {}) };
    delete extensions.jsonResponse;

    // Actualizar la card
    const updatedCard = {
      ...npc.card,
      data: {
        ...npc.card.data,
        extensions
      }
    };

    const updated = await npcDbManager.updateCard(id, updatedCard);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update NPC' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'JSON config removed successfully'
    });
  } catch (error) {
    console.error('[DELETE /api/npcs/[id]/json-config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

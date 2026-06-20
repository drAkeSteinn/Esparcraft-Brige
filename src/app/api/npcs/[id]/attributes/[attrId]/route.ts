import { NextRequest, NextResponse } from 'next/server';
import { npcAttributeManager } from '@/lib/attributeDbManager';
import { NPCAttributeInput, AttributeType } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string; attrId: string }>;
}

// PUT - Actualizar un atributo de un NPC
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { attrId } = await context.params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Campo requerido: name' }, { status: 400 });
    }
    if (!body.key || typeof body.key !== 'string' || !body.key.trim()) {
      return NextResponse.json({ error: 'Campo requerido: key' }, { status: 400 });
    }
    if (body.type !== 'numeric' && body.type !== 'text' && body.type !== 'list') {
      return NextResponse.json(
        { error: 'Campo requerido: type debe ser "numeric", "text" o "list"' },
        { status: 400 }
      );
    }

    const input: NPCAttributeInput = {
      name: body.name.trim(),
      key: body.key.trim(),
      type: body.type as AttributeType,
      // 'text' y 'list' guardan su valor en valueText
      valueText: body.type !== 'numeric' && body.valueText != null ? String(body.valueText) : null,
      valueNumber:
        body.type === 'numeric' && body.valueNumber != null ? Number(body.valueNumber) : null,
      minValue: body.type === 'numeric' && body.minValue != null ? Number(body.minValue) : null,
      maxValue: body.type === 'numeric' && body.maxValue != null ? Number(body.maxValue) : null,
    };

    const updated = await npcAttributeManager.update(attrId, input);

    if (!updated) {
      return NextResponse.json({ error: 'NPC attribute not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating NPC attribute:', error);
    const message = error instanceof Error ? error.message : 'Failed to update NPC attribute';
    if (message.toLowerCase().includes('ya tiene') || message.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE - Eliminar un atributo de un NPC
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { attrId } = await context.params;
    const success = await npcAttributeManager.delete(attrId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete NPC attribute' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'NPC attribute deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting NPC attribute:', error);
    return NextResponse.json(
      { error: 'Failed to delete NPC attribute' },
      { status: 500 }
    );
  }
}

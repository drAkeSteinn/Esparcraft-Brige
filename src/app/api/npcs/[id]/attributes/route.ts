import { NextRequest, NextResponse } from 'next/server';
import { npcAttributeManager, attributeTemplateManager } from '@/lib/attributeDbManager';
import { NPCAttributeInput, AttributeType } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Listar todos los atributos de un NPC
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const attributes = await npcAttributeManager.getByNpcId(id);

    return NextResponse.json({ success: true, data: attributes });
  } catch (error) {
    console.error('Error fetching NPC attributes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NPC attributes' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo atributo en un NPC
// Soporta dos modos:
//   1) fromTemplate: { fromTemplate: true, templateId } -> instancia desde plantilla
//   2) custom: { name, key, type, valueNumber/valueText, min, max } -> crea atributo ad-hoc
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: npcId } = await context.params;
    const body = await request.json();

    // Modo 1: instanciar desde plantilla
    if (body.fromTemplate === true) {
      if (!body.templateId) {
        return NextResponse.json(
          { error: 'Campo requerido: templateId (cuando fromTemplate=true)' },
          { status: 400 }
        );
      }
      const created = await attributeTemplateManager.instantiateForNpc(body.templateId, npcId);
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    // Modo 2: crear atributo custom
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Campo requerido: name' },
        { status: 400 }
      );
    }
    if (!body.key || typeof body.key !== 'string' || !body.key.trim()) {
      return NextResponse.json(
        { error: 'Campo requerido: key' },
        { status: 400 }
      );
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

    const created = await npcAttributeManager.create(npcId, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating NPC attribute:', error);
    const message = error instanceof Error ? error.message : 'Failed to create NPC attribute';
    if (message.toLowerCase().includes('ya tiene') || message.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

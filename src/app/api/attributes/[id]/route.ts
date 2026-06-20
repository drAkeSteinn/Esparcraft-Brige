import { NextRequest, NextResponse } from 'next/server';
import { attributeTemplateManager } from '@/lib/attributeDbManager';
import { AttributeTemplateInput, AttributeType } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Obtener una plantilla de atributo por ID
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const template = await attributeTemplateManager.getById(id);

    if (!template) {
      return NextResponse.json(
        { error: 'Attribute template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching attribute template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribute template' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una plantilla de atributo
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Campo requerido: name (string no vacío)' },
        { status: 400 }
      );
    }
    if (!body.key || typeof body.key !== 'string' || !body.key.trim()) {
      return NextResponse.json(
        { error: 'Campo requerido: key (string no vacío)' },
        { status: 400 }
      );
    }
    if (body.type !== 'numeric' && body.type !== 'text' && body.type !== 'list') {
      return NextResponse.json(
        { error: 'Campo requerido: type debe ser "numeric", "text" o "list"' },
        { status: 400 }
      );
    }

    const input: AttributeTemplateInput = {
      name: body.name.trim(),
      key: body.key.trim(),
      type: body.type as AttributeType,
      minValue: body.minValue != null ? Number(body.minValue) : null,
      maxValue: body.maxValue != null ? Number(body.maxValue) : null,
      defaultValue: body.defaultValue != null ? String(body.defaultValue) : null,
      description: body.description != null ? String(body.description) : null,
    };

    const updated = await attributeTemplateManager.update(id, input);

    if (!updated) {
      return NextResponse.json(
        { error: 'Attribute template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating attribute template:', error);
    const message = error instanceof Error ? error.message : 'Failed to update attribute template';
    if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('única')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE - Eliminar una plantilla de atributo
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const success = await attributeTemplateManager.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete attribute template' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attribute template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attribute template:', error);
    return NextResponse.json(
      { error: 'Failed to delete attribute template' },
      { status: 500 }
    );
  }
}

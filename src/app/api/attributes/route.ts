import { NextRequest, NextResponse } from 'next/server';
import { attributeTemplateManager } from '@/lib/attributeDbManager';
import { AttributeTemplateInput, AttributeType } from '@/lib/types';

// GET - Listar todas las plantillas de atributos
export async function GET() {
  try {
    const templates = await attributeTemplateManager.getAll();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching attribute templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribute templates' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva plantilla de atributo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
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

    const created = await attributeTemplateManager.create(input);

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating attribute template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create attribute template';
    // Si es error de unicidad de key, devolver 409
    if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('única')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

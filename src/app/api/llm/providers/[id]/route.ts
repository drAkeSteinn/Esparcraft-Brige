import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/lib/llm/providerManager';
import { LLMProviderInput, LLMProviderType, PROVIDERS } from '@/lib/llm/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Obtener un proveedor por ID
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const provider = await providerManager.getById(id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 });
  }
}

// PUT - Actualizar un proveedor
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!body.type || !PROVIDERS[body.type as LLMProviderType]) {
      return NextResponse.json(
        { error: `Tipo de proveedor inválido. Debe ser uno de: ${Object.keys(PROVIDERS).join(', ')}` },
        { status: 400 }
      );
    }

    const input: LLMProviderInput = {
      name: body.name,
      type: body.type,
      apiUrl: body.apiUrl,
      // Si apiKey viene undefined (no se envió), mantener el existente.
      // Si viene null o string vacío, se respeta (se puede borrar).
      apiKey: body.apiKey === undefined ? undefined : body.apiKey,
      model: body.model,
      temperature: body.temperature != null ? Number(body.temperature) : undefined,
      maxTokens: body.maxTokens != null ? Number(body.maxTokens) : undefined,
      reasoning: body.reasoning ?? false,
      toolCalling: body.toolCalling ?? false,
      isDefault: body.isDefault ?? false,
    };

    const updated = await providerManager.update(id, input);
    if (!updated) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating provider:', error);
    const message = error instanceof Error ? error.message : 'Failed to update provider';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE - Eliminar un proveedor
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const success = await providerManager.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Provider deleted' });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}

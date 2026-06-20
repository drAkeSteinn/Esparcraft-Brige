import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/lib/llm/providerManager';
import { LLMProviderInput, LLMProviderType, PROVIDERS } from '@/lib/llm/types';

// GET - Listar todos los proveedores
export async function GET() {
  try {
    const providers = await providerManager.getAll();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error fetching LLM providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM providers' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo proveedor
export async function POST(request: NextRequest) {
  try {
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
      apiKey: body.apiKey ?? null,
      model: body.model,
      temperature: body.temperature != null ? Number(body.temperature) : undefined,
      maxTokens: body.maxTokens != null ? Number(body.maxTokens) : undefined,
      reasoning: body.reasoning ?? false,
      toolCalling: body.toolCalling ?? false,
      isDefault: body.isDefault ?? false,
    };

    const created = await providerManager.create(input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating LLM provider:', error);
    const message = error instanceof Error ? error.message : 'Failed to create LLM provider';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

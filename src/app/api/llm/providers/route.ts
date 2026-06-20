import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/lib/llm/providerManager';
import { LLMProviderInput, LLMProviderType, PROVIDERS } from '@/lib/llm/types';

// GET - Listar todos los proveedores
export async function GET() {
  try {
    const providers = await providerManager.getAll();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    // Devolver el mensaje real para que el frontend lo pueda mostrar.
    // Antes se ocultaba con un string genérico ("Failed to fetch LLM providers"),
    // lo que hacía imposible diagnosticar el problema desde el navegador.
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : undefined;
    console.error('Error fetching LLM providers:', { message, code, error });
    return NextResponse.json(
      {
        error: 'Failed to fetch LLM providers',
        details: message,
        prismaCode: code,
        hint:
          code === 'P2021'
            ? 'La tabla LLMProvider no existe en la BD. Ejecuta `bun run db:push` para crear el schema.'
            : undefined,
      },
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

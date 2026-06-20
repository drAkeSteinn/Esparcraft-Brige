import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/lib/llm/providerManager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/llm/providers/[id]/set-default
// Marca un proveedor como el activo (default) para los triggers.
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const updated = await providerManager.setDefault(id);
    if (!updated) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: `Proveedor "${updated.name}" marcado como activo`,
      data: updated,
    });
  } catch (error) {
    console.error('Error setting default provider:', error);
    return NextResponse.json(
      { error: 'Failed to set default provider' },
      { status: 500 }
    );
  }
}

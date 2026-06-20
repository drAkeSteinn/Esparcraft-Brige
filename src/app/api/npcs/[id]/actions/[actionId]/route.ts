import { NextRequest, NextResponse } from 'next/server';
import { npcActionManager } from '@/lib/actionDbManager';

interface RouteContext {
  params: Promise<{ id: string; actionId: string }>;
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const { actionId } = await ctx.params;
    const body = await request.json();
    if (!body.name?.trim() || !body.key?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'name, key y description son requeridos' }, { status: 400 });
    }
    const updated = await npcActionManager.update(actionId, {
      name: body.name, key: body.key, description: body.description,
      parameters: body.parameters ?? null,
    });
    if (!updated) return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { actionId } = await ctx.params;
    const ok = await npcActionManager.delete(actionId);
    if (!ok) return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Acción eliminada' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

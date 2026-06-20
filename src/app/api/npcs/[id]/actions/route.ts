import { NextRequest, NextResponse } from 'next/server';
import { npcActionManager } from '@/lib/actionDbManager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const actions = await npcActionManager.getByNpcId(id);
    return NextResponse.json({ success: true, data: actions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    if (!body.name?.trim() || !body.key?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'name, key y description son requeridos' }, { status: 400 });
    }
    const created = await npcActionManager.create(id, {
      name: body.name, key: body.key, description: body.description,
      parameters: body.parameters ?? null,
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager } from '@/lib/fileManager';
import { ApplyGrimorioCardRequest } from '@/lib/types';
import { replaceVariables, VariableContext } from '@/lib/utils';
import { npcManager, worldManager, puebloManager, edificioManager, sessionManager } from '@/lib/fileManager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { context } = await request.json() as ApplyGrimorioCardRequest;

    if (!context) {
      return NextResponse.json({ success: false, error: 'Contexto requerido' }, { status: 400 });
    }

    const card = grimorioManager.getById(id);
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card no encontrada' }, { status: 404 });
    }

    let world, pueblo, edificio, npc, session;

    if (context.npc?.npcid) {
      npc = npcManager.getById(context.npc.npcid);
      if (npc) {
        world = worldManager.getById(npc.location.worldId);
        pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
        edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;
      }
    }

    if (context.session?.playersessionid) {
      session = sessionManager.getById(context.session.playersessionid);
    }

    const varContext: VariableContext = {
      npc, world, pueblo, edificio,
      jugador: context.jugador, session,
      char: npc?.card?.data?.name || npc?.card?.name || '',
      mensaje: context.mensaje,
      userMessage: context.mensaje,
      lastSummary: undefined
    };

    const templateReemplazado = replaceVariables(card.plantilla, varContext);
    console.log(\`[Grimorio] Card "\${card.nombre}" (\${card.key}) aplicada\`);

    return NextResponse.json({ success: true, data: { template: templateReemplazado, cardId: id }, message: 'Aplicada correctamente' });
  } catch (error) {
    console.error('Error aplicando card:', error);
    return NextResponse.json({ success: false, error: 'Error al aplicar' }, { status: 500 });
  }
}

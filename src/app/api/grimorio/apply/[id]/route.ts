import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager, worldManager, puebloManager, edificioManager, sessionManager } from '@/lib/fileManager';
import { ApplyGrimorioCardRequest } from '@/lib/types';
import { resolveAllVariablesWithCache, VariableContext } from '@/lib/grimorioUtils';
import { npcDbManager } from '@/lib/npcDbManager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json() as ApplyGrimorioCardRequest & { useCache?: boolean };
    const { context, useCache = true } = body;

    if (!context) {
      return NextResponse.json({ success: false, error: 'Contexto requerido' }, { status: 400 });
    }

    const card = grimorioManager.getById(id);
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card no encontrada' }, { status: 404 });
    }

    let world, pueblo, edificio, npc, session;

    if (context.npc?.npcid) {
      npc = await npcDbManager.getById(context.npc.npcid);
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

    // Obtener todas las cards del Grimorio para resolución de plantillas
    const allGrimorioCards = grimorioManager.getAll();

    // Resolver todas las variables (primarias y plantillas) con cache
    const startTime = Date.now();
    const { result: templateReemplazado, stats } = resolveAllVariablesWithCache(
      card.plantilla,
      varContext,
      allGrimorioCards,
      card.id, // Usar el ID de la card como templateId
      { verbose: false, useCache }
    );
    const executionTime = Date.now() - startTime;

    console.log(`[Grimorio] Card "${card.nombre}" (${card.key}) aplicada (tipo: ${card.tipo})`);
    console.log(`[Grimorio] Cache: ${stats.fromCache ? 'HIT' : 'MISS'}`);
    console.log(`[Grimorio] Stats: ${stats.resolved} resueltas, ${stats.emptyReturned} vacías, ${stats.errors} errores, ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        template: templateReemplazado,
        cardId: id,
        cardType: card.tipo,
        fromCache: stats.fromCache,
        stats: {
          ...stats,
          executionTime
        }
      },
      message: 'Aplicada correctamente'
    });
  } catch (error) {
    console.error('Error aplicando card:', error);
    return NextResponse.json({ success: false, error: 'Error al aplicar' }, { status: 500 });
  }
}

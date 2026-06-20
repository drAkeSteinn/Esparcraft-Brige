import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager, worldManager, puebloManager, edificioManager, sessionManager } from '@/lib/fileManager';
import { ApplyGrimorioCardRequest, formatAttributeValue } from '@/lib/types';
import { resolveAllVariablesWithCache, resolveConditionalTemplate, VariableContext } from '@/lib/grimorioUtils';
import { npcDbManager } from '@/lib/npcDbManager';
import { npcAttributeManager } from '@/lib/attributeDbManager';

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
    let npcAttributesList: import('@/lib/types').NPCAttribute[] | undefined;
    let npcAttributesMap: Record<string, string> | undefined;

    if (context.npc?.npcid) {
      npc = await npcDbManager.getById(context.npc.npcid);
      if (npc) {
        world = worldManager.getById(npc.location.worldId);
        pueblo = npc.location.puebloId ? puebloManager.getById(npc.location.puebloId) : undefined;
        edificio = npc.location.edificioId ? edificioManager.getById(npc.location.edificioId) : undefined;

        // Cargar atributos del NPC para plantillas condicionales y {{key}} de atributos
        try {
          npcAttributesList = await npcAttributeManager.getByNpcId(context.npc.npcid);
          npcAttributesMap = {};
          for (const attr of npcAttributesList) {
            npcAttributesMap[attr.key] = formatAttributeValue(attr);
          }
        } catch (e) {
          console.warn('[Grimorio apply] No se pudieron cargar atributos del NPC:', (e as Error).message);
        }
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
      lastSummary: undefined,
      attributes: npcAttributesMap,
      npcAttributes: npcAttributesList,
    };

    // Obtener todas las cards del Grimorio para resolución de plantillas
    const allGrimorioCards = grimorioManager.getAll();

    const startTime = Date.now();

    // ✅ Plantilla condicional: resolver directamente con resolveConditionalTemplate
    // (card.plantilla está vacío para condicionales, hay que evaluar branches)
    let templateReemplazado: string;
    let stats: { resolved: number; emptyReturned: number; errors: number; fromCache: boolean; executionTime?: number; matchedBranchId?: string | null };

    if (card.templateType === 'condicional' && card.conditionalConfig) {
      const condResult = resolveConditionalTemplate(
        card.conditionalConfig,
        npcAttributesList,
        varContext,
        allGrimorioCards
      );
      templateReemplazado = condResult.value;
      stats = {
        resolved: condResult.matchedBranchId ? 1 : 0,
        emptyReturned: condResult.matchedBranchId ? 0 : 1,
        errors: condResult.errors.length,
        fromCache: false,
        matchedBranchId: condResult.matchedBranchId,
      };
      console.log(`[Grimorio] Plantilla condicional "${card.nombre}": branch=${condResult.matchedBranchId ?? 'default'}, errores=${condResult.errors.length}`);
    } else {
      // Plantilla normal: resolver todas las variables con cache
      const resolution = resolveAllVariablesWithCache(
        card.plantilla,
        varContext,
        allGrimorioCards,
        card.id,
        { verbose: false, useCache }
      );
      templateReemplazado = resolution.result;
      stats = { ...resolution.stats };
    }

    const executionTime = Date.now() - startTime;
    stats.executionTime = executionTime;

    console.log(`[Grimorio] Card "${card.nombre}" (${card.key}) aplicada (tipo: ${card.tipo}${card.templateType ? '/' + card.templateType : ''})`);
    console.log(`[Grimorio] Cache: ${stats.fromCache ? 'HIT' : 'MISS'}`);
    console.log(`[Grimorio] Stats: ${stats.resolved} resueltas, ${stats.emptyReturned} vacías, ${stats.errors} errores, ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        template: templateReemplazado,
        cardId: id,
        cardType: card.tipo,
        templateType: card.templateType || 'normal',
        fromCache: stats.fromCache,
        stats,
      },
      message: 'Aplicada correctamente'
    });
  } catch (error) {
    console.error('Error aplicando card:', error);
    return NextResponse.json({ success: false, error: 'Error al aplicar' }, { status: 500 });
  }
}

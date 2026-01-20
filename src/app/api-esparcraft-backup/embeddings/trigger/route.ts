import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingTriggers } from '@/lib/embedding-triggers';

/**
 * POST /api/embeddings/trigger
 * Dispara triggers automáticos de embeddings
 *
 * Body:
 * {
 *   type: 'world' | 'pueblo' | 'edificio' | 'npc' | 'session' | 'all',
 *   id?: string // ID específico para un solo recurso
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { error: 'type es requerido' },
        { status: 400 }
      );
    }

    let result;

    switch (body.type) {
      case 'world':
        if (!body.id) {
          return NextResponse.json(
            { error: 'id es requerido para tipo world' },
            { status: 400 }
          );
        }
        await EmbeddingTriggers.embedWorld(body.id);
        result = { type: 'world', id: body.id };
        break;

      case 'pueblo':
        if (!body.id) {
          return NextResponse.json(
            { error: 'id es requerido para tipo pueblo' },
            { status: 400 }
          );
        }
        await EmbeddingTriggers.embedPueblo(body.id);
        result = { type: 'pueblo', id: body.id };
        break;

      case 'edificio':
        if (!body.id) {
          return NextResponse.json(
            { error: 'id es requerido para tipo edificio' },
            { status: 400 }
          );
        }
        await EmbeddingTriggers.embedEdificio(body.id);
        result = { type: 'edificio', id: body.id };
        break;

      case 'npc':
        if (!body.id) {
          return NextResponse.json(
            { error: 'id es requerido para tipo npc' },
            { status: 400 }
          );
        }
        await EmbeddingTriggers.embedNPC(body.id);
        result = { type: 'npc', id: body.id };
        break;

      case 'session':
        if (!body.id) {
          return NextResponse.json(
            { error: 'id es requerido para tipo session' },
            { status: 400 }
          );
        }
        await EmbeddingTriggers.embedSession(body.id);
        result = { type: 'session', id: body.id };
        break;

      case 'all':
        // Generar embeddings para todos los recursos
        await EmbeddingTriggers.embedAllResources('worlds');
        await EmbeddingTriggers.embedAllResources('pueblos');
        await EmbeddingTriggers.embedAllResources('edificios');
        await EmbeddingTriggers.embedAllResources('npcs');
        result = { type: 'all', message: 'Embeddings generados para todos los recursos' };
        break;

      default:
        return NextResponse.json(
          { error: 'tipo inválido. Debe ser: world, pueblo, edificio, npc, session, o all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error ejecutando trigger de embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al ejecutar trigger',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings/trigger/search
 * Busca contexto relevante de embeddings
 *
 * Query params:
 * - query: string - Consulta de búsqueda
 * - namespace: string - Namespace opcional
 * - source_type: string - Tipo de fuente opcional
 * - limit: number - Límite de resultados (default: 5)
 * - threshold: number - Umbral de similitud (default: 0.7)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'query es requerido' },
        { status: 400 }
      );
    }

    const context = await EmbeddingTriggers.searchContext(
      query,
      {
        namespace: searchParams.get('namespace') || undefined,
        source_type: searchParams.get('source_type') || undefined,
        limit: parseInt(searchParams.get('limit') || '5'),
        threshold: parseFloat(searchParams.get('threshold') || '0.7')
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        query,
        context,
        hasContext: context.length > 0
      }
    });
  } catch (error: any) {
    console.error('Error buscando contexto de embeddings:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al buscar contexto',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/text-gen-client';
import { LanceDBWrapper } from '@/lib/lancedb-db';

/**
 * POST /api/search/vector
 * Busca embeddings por similitud coseno vectorial
 *
 * Body:
 * {
 *   query: string;              // Texto a buscar (se genera embedding)
 *   queryVector?: number[];       // Vector directo (opcional)
 *   namespace?: string;         // Filtrar por namespace
 *   limit?: number;               // Límite de resultados (default: 10, max: 100)
 *   threshold?: number;            // Umbral de similitud (default: 0.7)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar query o queryVector
    if (!body.query && !body.queryVector) {
      return NextResponse.json(
        { error: 'Se requiere query o queryVector' },
        { status: 400 }
      );
    }

    if (body.query && typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'query debe ser un string' },
        { status: 400 }
      );
    }

    if (body.queryVector && !Array.isArray(body.queryVector)) {
      return NextResponse.json(
        { error: 'queryVector debe ser un array de números' },
        { status: 400 }
      );
    }

    // Validar límites
    const limit = Math.min(
      parseInt(body.limit || '10'),
      100
    );

    const threshold = parseFloat(body.threshold || '0.7');
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { error: 'threshold debe ser un número entre 0 y 1' },
        { status: 400 }
      );
    }

    const textGenClient = getEmbeddingClient();
    let queryVector: number[];

    // Usar vector proporcionado o generarlo desde la query
    if (body.queryVector) {
      queryVector = body.queryVector;
    } else {
      // Generar embedding de la query de texto
      queryVector = await textGenClient.embedText(body.query);
    }

    // Preparar parámetros de búsqueda
    const searchParams: any = {
      queryVector,
      limit,
      threshold
    };

    if (body.namespace) {
      searchParams.namespace = body.namespace;
    }

    // Hacer la búsqueda vectorial usando la base de datos
    const results = await LanceDBWrapper.searchSimilar(searchParams);

    // Filtrar si se especificó source_type
    let filteredResults = results;
    if (body.source_type) {
      filteredResults = results.filter(r => r.source_type === body.source_type);
    }

    if (body.source_id) {
      filteredResults = filteredResults.filter(r => r.source_id === body.source_id);
    }

    // Agregar metadatos de la búsqueda
    const searchMetadata = {
      queryType: body.queryVector ? 'vector' : 'text',
      queryLength: body.query?.length || 0,
      vectorDimension: queryVector.length,
      threshold,
      resultCount: filteredResults.length,
      namespace: body.namespace || 'all',
      searchTime: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        results: filteredResults,
        metadata: searchMetadata
      }
    });

  } catch (error: any) {
    console.error('Error en búsqueda vectorial:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error en búsqueda vectorial',
        code: error.code || 'SEARCH_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

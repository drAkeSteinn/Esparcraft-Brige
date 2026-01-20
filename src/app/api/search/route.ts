import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingsDB } from '@/lib/embeddings-db';

/**
 * POST /api/search/similar
 * Busca embeddings similares a un embedding específico
 *
 * Body:
 * {
 *   embeddingId: string;           // ID del embedding de referencia
 *   limit?: number;                // Límite de resultados (default: 10, max: 100)
 *   threshold?: number;             // Umbral de similitud (default: 0.7)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar embeddingId
    if (!body.embeddingId || typeof body.embeddingId !== 'string') {
      return NextResponse.json(
        { error: 'embeddingId es requerido y debe ser un string' },
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

    // Obtener el embedding de referencia
    const referenceEmbedding = await EmbeddingsDB.getEmbeddingById(body.embeddingId);

    if (!referenceEmbedding) {
      return NextResponse.json(
        { error: 'Embedding de referencia no encontrado' },
        { status: 404 }
      );
    }

    // Buscar embeddings similares usando el vector del embedding de referencia
    const similarEmbeddings = await EmbeddingsDB.searchSimilar({
      queryVector: referenceEmbedding.vector || [],
      limit,
      threshold
    });

    // Filtrar el embedding de referencia de los resultados
    const filteredResults = similarEmbeddings.filter(
      result => result.id !== body.embeddingId
    );

    // Agregar metadatos de la búsqueda
    const searchMetadata = {
      referenceEmbeddingId: body.embeddingId,
      referenceEmbeddingContent: referenceEmbedding.content?.substring(0, 100) + '...',
      referenceNamespace: referenceEmbedding.namespace,
      vectorDimension: referenceEmbedding.vector?.length || 0,
      threshold,
      resultCount: filteredResults.length,
      searchTime: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        reference: {
          id: referenceEmbedding.id,
          content: referenceEmbedding.content,
          metadata: referenceEmbedding.metadata,
          namespace: referenceEmbedding.namespace,
          source_type: referenceEmbedding.source_type,
          source_id: referenceEmbedding.source_id
        },
        similar: filteredResults,
        metadata: searchMetadata
      }
    });

  } catch (error: any) {
    console.error('Error al buscar documentos similares:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al buscar documentos similares',
        code: error.code || 'SEARCH_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

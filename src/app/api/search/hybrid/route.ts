import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddingClient } from '@/lib/embeddings/text-gen-client';
import { LanceDBWrapper } from '@/lib/lancedb-db';

/**
 * POST /api/search/hybrid
 * Búsqueda híbrida que combina búsqueda de texto con búsqueda vectorial
 *
 * Proceso:
 * 1. Genera embedding de la query
 * 2. Búsqueda vectorial para encontrar documentos similares
 * 3. Búsqueda de texto simple para encontrar coincidencias exactas
 * 4. Combina y rankea los resultados
 *
 * Body:
 * {
 *   query: string;                  // Texto a buscar
 *   namespace?: string;              // Filtrar por namespace
 *   limit?: number;                   // Límite total de resultados (default: 10)
 *   vectorLimit?: number;            // Límite de resultados vectoriales (default: 5)
 *   textLimit?: number;             // Límite de resultados de texto (default: 5)
 *   threshold?: number;              // Umbral de similitud vectorial (default: 0.6)
 *   fusionWeight?: number;           // Peso del ranking (default: 0.6 vector, 0.4 texto)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar query
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'query es requerido y debe ser un string' },
        { status: 400 }
      );
    }

    if (body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query no puede estar vacío' },
        { status: 400 }
      );
    }

    // Validar límites
    const limit = Math.min(
      parseInt(body.limit || '10'),
      100
    );

    const vectorLimit = Math.min(
      parseInt(body.vectorLimit || '5'),
      50
    );

    const textLimit = Math.min(
      parseInt(body.textLimit || '5'),
      50
    );

    const threshold = parseFloat(body.threshold || '0.6');
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { error: 'threshold debe ser un número entre 0 y 1' },
        { status: 400 }
      );
    }

    const fusionWeight = {
      vector: parseFloat(body.fusionWeight?.vector || '0.6'),
      text: parseFloat(body.fusionWeight?.text || '0.4')
    };

    if (fusionWeight.vector + fusionWeight.text !== 1.0) {
      return NextResponse.json(
        { error: 'Los pesos de fusión deben sumar 1.0' },
        { status: 400 }
      );
    }

    // 1. Búsqueda vectorial
    const textGenClient = getEmbeddingClient();
    const queryVector = await textGenClient.embedText(body.query);

    const vectorResults = await LanceDBWrapper.searchSimilar({
      queryVector,
      namespace: body.namespace,
      limit: vectorLimit,
      threshold
    });

    // 2. Búsqueda de texto simple (coincidencia exacta)
    // Obtenemos todos los embeddings y filtramos por texto
    // En una implementación real, usaríamos full-text search de PostgreSQL
    // Aquí hacemos una búsqueda simple usando LIKE
    const textResults: any[] = [];

    // Filtrar los resultados vectoriales que coinciden con el query
    const queryLower = body.query.toLowerCase();

    vectorResults.forEach(result => {
      if (result.content.toLowerCase().includes(queryLower)) {
        textResults.push({
          ...result,
          matchType: 'exact',
          matchScore: 1.0 // Coincidencia exacta
        });
      }
    });

    // 3. Fusionar y ranpear resultados
    const resultScores = new Map<string, {
      vectorScore: number;
      textScore: number;
      combinedScore: number;
      matchType: string;
    }>();

    // Asignar puntajes vectoriales
    vectorResults.forEach((result, index) => {
      const existing = resultScores.get(result.id);
      const vectorScore = result.similarity; // Similitud ya está entre 0 y 1

      if (existing) {
        resultScores.set(result.id, {
          ...existing,
          vectorScore: Math.max(existing.vectorScore, vectorScore)
        });
      } else {
        resultScores.set(result.id, {
          vectorScore,
          textScore: 0,
          combinedScore: vectorScore * fusionWeight.vector,
          matchType: 'vector'
        });
      }
    });

    // Asignar puntajes de texto
    textResults.forEach(result => {
      const existing = resultScores.get(result.id);
      const textScore = result.matchScore;

      if (existing) {
        const newCombinedScore =
          existing.vectorScore * fusionWeight.vector +
          textScore * fusionWeight.text;
        resultScores.set(result.id, {
          ...existing,
          textScore: Math.max(existing.textScore, textScore),
          combinedScore: Math.max(existing.combinedScore, newCombinedScore),
          matchType: 'hybrid'
        });
      } else {
        resultScores.set(result.id, {
          vectorScore: 0,
          textScore,
          combinedScore: textScore * fusionWeight.text,
          matchType: 'text'
        });
      }
    });

    // 4. Ordenar por score combinado y limitar
    const sortedResults = Array.from(resultScores.entries())
      .map(([id, scores]) => {
        const result = vectorResults.find(r => r.id === id) ||
                         textResults.find(r => r.id === id);
        return {
          ...result,
          scores
        };
      })
      .sort((a, b) => b.scores.combinedScore - a.scores.combinedScore)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        results: sortedResults,
        metadata: {
          queryType: 'hybrid',
          queryLength: body.query.length,
          vectorDimension: queryVector.length,
          threshold,
          vectorResultsCount: vectorResults.length,
          textResultsCount: textResults.length,
          fusionWeight,
          resultCount: sortedResults.length,
          namespace: body.namespace || 'all',
          searchTime: new Date().toISOString()
        }
      }
    });

  } catch (error: any) {
    console.error('Error en búsqueda híbrida:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error en búsqueda híbrida',
        code: error.code || 'SEARCH_ERROR'
      },
      { status: error.status || 500 }
    );
  }
}

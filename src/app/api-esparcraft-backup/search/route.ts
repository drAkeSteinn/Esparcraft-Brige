import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/search
 * Endpoint de documentación y búsqueda rápida
 *
 * Query params:
 * - q: string - Query de búsqueda rápida
 * - type: 'vector' | 'hybrid' | 'similar' - Tipo de búsqueda
 * - limit: number - Límite de resultados
 * - namespace: string - Namespace para filtrar
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'vector';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const namespace = searchParams.get('namespace');

  // Documentación de la API
  const documentation = {
    title: 'API de Búsqueda de Embeddings',
    version: '1.0.0',
    description: 'API para buscar embeddings vectoriales en el sistema Bridge IA',
    endpoints: {
      vector: {
        method: 'POST',
        path: '/api/search/vector',
        description: 'Búsqueda vectorial pura por similitud coseno',
        parameters: {
          query: { type: 'string', required: true, description: 'Texto a buscar (se genera embedding)' },
          queryVector: { type: 'number[]', required: false, description: 'Vector directo (opcional)' },
          namespace: { type: 'string', required: false, description: 'Filtrar por namespace' },
          limit: { type: 'number', required: false, description: 'Límite de resultados (default: 10, max: 100)' },
          threshold: { type: 'number', required: false, description: 'Umbral de similitud (default: 0.7)' }
        }
      },
      hybrid: {
        method: 'POST',
        path: '/api/search/hybrid',
        description: 'Búsqueda híbrida que combina búsqueda de texto con búsqueda vectorial',
        parameters: {
          query: { type: 'string', required: true, description: 'Texto a buscar' },
          namespace: { type: 'string', required: false, description: 'Filtrar por namespace' },
          limit: { type: 'number', required: false, description: 'Límite total de resultados (default: 10)' },
          vectorLimit: { type: 'number', required: false, description: 'Límite de resultados vectoriales (default: 5)' },
          textLimit: { type: 'number', required: false, description: 'Límite de resultados de texto (default: 5)' },
          threshold: { type: 'number', required: false, description: 'Umbral de similitud vectorial (default: 0.6)' },
          fusionWeight: { type: 'object', required: false, description: 'Peso de cada tipo de búsqueda (vector: 0.6, text: 0.4)' }
        }
      },
      similar: {
        method: 'POST',
        path: '/api/search/similar',
        description: 'Busca embeddings similares a un embedding específico',
        parameters: {
          embeddingId: { type: 'string', required: true, description: 'ID del embedding de referencia' },
          limit: { type: 'number', required: false, description: 'Límite de resultados (default: 10, max: 100)' },
          threshold: { type: 'number', required: false, description: 'Umbral de similitud (default: 0.7)' }
        }
      }
    },
    examples: {
      vectorSearch: {
        description: 'Búsqueda vectorial básica',
        request: {
          query: "historia del mundo medieval",
          limit: 10,
          threshold: 0.7
        }
      },
      hybridSearch: {
        description: 'Búsqueda híbrida vectorial + texto',
        request: {
          query: "reino de los elfos",
          namespace: "world:world-123",
          vectorLimit: 5,
          textLimit: 5,
          threshold: 0.6
        }
      },
      similarDocuments: {
        description: 'Documentos similares a uno específico',
        request: {
          embeddingId: "abc123",
          limit: 10,
          threshold: 0.8
        }
      }
    }
  };

  // Si hay query, hacer una búsqueda rápida redirigendo a la búsqueda vectorial
  if (query) {
    try {
      // Hacer una búsqueda rápida usando la API vectorial
      const searchPayload = {
        query,
        limit,
        namespace,
        threshold: parseFloat(searchParams.get('threshold') || '0.7')
      };

      // Redirigir a la búsqueda vectorial
      const vectorSearchResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/search/vector`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchPayload)
        }
      );

      if (vectorSearchResponse.ok) {
        const data = await vectorSearchResponse.json();
        return NextResponse.json(data);
      } else {
        throw new Error('Error en búsqueda vectorial');
      }

    } catch (error) {
      console.error('Error en búsqueda rápida:', error);
      // En caso de error, retornar la documentación
    }
  }

  // Retornar documentación
  return NextResponse.json({
    success: true,
    data: {
      documentation,
      info: 'Usa POST en /api/search/vector, /api/search/hybrid, o /api/search/similar para búsquedas completas'
    }
  });
}

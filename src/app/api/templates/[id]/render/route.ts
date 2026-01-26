'use server';

import { NextRequest, NextResponse } from 'next/server';
import { customTemplateManager } from '@/lib/customTemplates';
import { templateCache } from '@/lib/templateCache';
import { VariableContext } from '@/lib/utils';

/**
 * POST /api/templates/[id]/render
 * 
 * Renderiza una plantilla con un contexto dado
 * 
 * Body:
 * {
 *   context: VariableContext,
 *   options?: {
 *     validate?: boolean,
 *     throwOnError?: boolean,
 *     showPlaceholders?: boolean,
 *     useCache?: boolean
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { context, options } = body;

    if (!context) {
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400 }
      );
    }

    const template = customTemplateManager.getTemplate(params.id);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verificar si usamos cache
    const useCache = options?.useCache !== false;
    
    if (useCache) {
      // Intentar obtener del cache
      const cached = templateCache.get(params.id, context as VariableContext);
      if (cached !== null) {
        return NextResponse.json({
          success: true,
          data: {
            content: cached,
            fromCache: true
          }
        });
      }
    }

    // Renderizar la plantilla
    const result = customTemplateManager.renderTemplate(
      params.id,
      context as VariableContext,
      options || {}
    );

    // Guardar en cache si fue exitoso
    if (useCache && result.success) {
      templateCache.set(params.id, context as VariableContext, result.content);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        fromCache: false
      }
    });
  } catch (error) {
    console.error('Error rendering template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to render template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

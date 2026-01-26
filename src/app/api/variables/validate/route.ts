'use server';

import { NextRequest, NextResponse } from 'next/server';
import { validateTemplate, validateContext, formatValidationErrors, getSuggestedVariables } from '@/lib/validateVariables';
import { VariableContext } from '@/lib/utils';
import { getVariablesByCategory, generateGlossaryMarkdown, extractVariablesFromText } from '@/lib/VARIABLE_GLOSSARY';

/**
 * POST /api/variables/validate
 * 
 * Valida un template o texto con variables
 * 
 * Body:
 * {
 *   text: string,          // Texto a validar
 *   context?: {            // Contexto opcional para validar
 *     npc?: any,
 *     jugador?: any,
 *     world?: any,
 *     pueblo?: any,
 *     edificio?: any,
 *     session?: any
 *   },
 *   options?: {
 *     checkUnknown?: boolean,
 *     checkMissing?: boolean,
 *     checkEmpty?: boolean,
 *     checkCyclic?: boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context, options } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // Validar el template
    const result = validateTemplate(text, context as VariableContext, options);

    return NextResponse.json({
      success: true,
      validation: result,
      formatted: formatValidationErrors(result)
    });
  } catch (error) {
    console.error('Error validating template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/variables/validate
 * 
 * Obtiene información sobre el sistema de variables
 * 
 * Query params:
 * - category: Filtrar por categoría (opcional)
 * - type: 'glossary' | 'stats' | 'extract' (opcional)
 * - text: Texto del cual extraer variables (requerido si type='extract')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const text = searchParams.get('text');

    // Obtener glosario
    if (type === 'glossary') {
      const markdown = generateGlossaryMarkdown();
      return NextResponse.json({
        success: true,
        type: 'glossary',
        data: markdown
      });
    }

    // Obtener estadísticas
    if (type === 'stats') {
      const variables = category 
        ? getVariablesByCategory(category as any)
        : Object.values({});

      return NextResponse.json({
        success: true,
        type: 'stats',
        data: {
          totalVariables: variables.length,
          category: category || 'all',
          variables: variables.map(v => ({
            name: v.name,
            type: v.type,
            required: v.required,
            nested: v.nested,
            aliases: v.aliases
          }))
        }
      });
    }

    // Extraer variables de texto
    if (type === 'extract') {
      if (!text) {
        return NextResponse.json(
          { error: 'text parameter is required for type=extract' },
          { status: 400 }
        );
      }

      const extracted = extractVariablesFromText(text);
      
      return NextResponse.json({
        success: true,
        type: 'extract',
        data: {
          text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          variables: extracted,
          count: extracted.length
        }
      });
    }

    // Por defecto, obtener todas las variables (o filtrar por categoría)
    const variables = category
      ? getVariablesByCategory(category as any)
      : Object.values({});

    return NextResponse.json({
      success: true,
      type: 'list',
      category: category || 'all',
      count: variables.length,
      data: variables
    });
  } catch (error) {
    console.error('Error getting variable info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get variable info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

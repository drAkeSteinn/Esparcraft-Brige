'use server';

import { NextRequest, NextResponse } from 'next/server';
import { customTemplateManager, CustomTemplate } from '@/lib/customTemplates';
import { templateCache } from '@/lib/templateCache';
import { VariableContext } from '@/lib/utils';

/**
 * GET /api/templates/[id]
 * 
 * Obtiene una plantilla por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = customTemplateManager.getTemplate(params.id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[id]
 * 
 * Actualiza una plantilla existente
 * 
 * Body:
 * {
 *   name?: string,
 *   content?: string,
 *   description?: string,
 *   tags?: string[],
 *   active?: boolean
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = body;

    const updated = customTemplateManager.updateTemplate(params.id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Invalidar cache de esta plantilla
    templateCache.invalidateTemplate(params.id);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * 
 * Elimina una plantilla por ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = customTemplateManager.deleteTemplate(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Invalidar cache de esta plantilla
    templateCache.invalidateTemplate(params.id);

    return NextResponse.json({
      success: true,
      deleted
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

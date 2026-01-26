'use server';

import { NextRequest, NextResponse } from 'next/server';
import { customTemplateManager, CustomTemplate } from '@/lib/customTemplates';
import { templateCache } from '@/lib/templateCache';

/**
 * GET /api/templates
 * 
 * Obtiene todas las plantillas o filtra por parámetros
 * 
 * Query params:
 * - category: Filtrar por categoría (opcional)
 * - tag: Filtrar por tag (opcional)
 * - search: Buscar por texto (opcional)
 * - active: 'true' | 'false' (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    let templates = customTemplateManager.getAllTemplates();

    // Filtrar por categoría
    if (category) {
      templates = customTemplateManager.getTemplatesByCategory(category as any);
    }

    // Filtrar por tag
    if (tag) {
      templates = templates.filter(t => t.tags.includes(tag));
    }

    // Filtrar por activo/inactivo
    if (active !== null) {
      const isActive = active === 'true';
      templates = templates.filter(t => t.active === isActive);
    }

    // Buscar por texto
    if (search) {
      templates = customTemplateManager.searchTemplates(search);
    }

    return NextResponse.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * 
 * Crea una nueva plantilla
 * 
 * Body:
 * {
 *   name: string,
 *   content: string,
 *   description?: string,
 *   category?: 'user' | 'npc' | 'system' | 'custom',
 *   tags?: string[],
 *   active?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, description, category, tags, active } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'name and content are required' },
        { status: 400 }
      );
    }

    const template = customTemplateManager.createTemplate(name, content, {
      description,
      category,
      tags,
      active
    });

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates
 * 
 * Actualiza una plantilla existente (por nombre)
 * 
 * Body:
 * {
 *   name: string,
 *   updates: {
 *     content?: string,
 *     description?: string,
 *     tags?: string[],
 *     active?: boolean
 *   }
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, updates } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const template = customTemplateManager.getTemplateByName(name);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const updated = customTemplateManager.updateTemplate(template.id, updates);

    // Invalidar cache de esta plantilla
    templateCache.invalidateTemplate(template.id);

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
 * DELETE /api/templates
 * 
 * Elimina una plantilla por nombre
 * 
 * Query params:
 * - name: Nombre de la plantilla a eliminar
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const template = customTemplateManager.getTemplateByName(name);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const deleted = customTemplateManager.deleteTemplate(template.id);

    // Invalidar cache de esta plantilla
    templateCache.invalidateTemplate(template.id);

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

'use server';

import { NextRequest, NextResponse } from 'next/server';
import { customTemplateManager } from '@/lib/customTemplates';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { newName } = body;

    if (!newName) {
      return NextResponse.json(
        { error: 'newName is required' },
        { status: 400 }
      );
    }

    const duplicated = customTemplateManager.duplicateTemplate(params.id, newName);

    if (!duplicated) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: duplicated
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to duplicate template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

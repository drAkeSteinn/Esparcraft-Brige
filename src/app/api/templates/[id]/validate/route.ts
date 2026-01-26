'use server';

import { NextRequest, NextResponse } from 'next/server';
import { customTemplateManager } from '@/lib/customTemplates';
import { VariableContext } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { context } = body;

    const validation = customTemplateManager.validateTemplate(
      params.id,
      context as VariableContext
    );

    return NextResponse.json({
      success: true,
      data: validation
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

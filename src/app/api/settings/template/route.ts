import { NextRequest, NextResponse } from 'next/server';
import { templateUserManager } from '@/lib/fileManager';

/**
 * API para gestionar el Template User global
 *
 * GET - Obtener el template guardado
 * POST - Guardar un nuevo template
 */

export async function GET() {
  try {
    const template = templateUserManager.getTemplate();

    return NextResponse.json({
      success: true,
      data: {
        template,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error obteniendo template user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el template del usuario'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { template } = await request.json();

    // Validar que template sea un string
    if (typeof template !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'El template debe ser un string'
        },
        { status: 400 }
      );
    }

    // Guardar el template
    templateUserManager.saveTemplate(template);

    console.log('Template User guardado correctamente:', template.substring(0, 100) + '...');

    return NextResponse.json({
      success: true,
      data: {
        message: 'Template del usuario guardado correctamente',
        template,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error guardando template user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al guardar el template del usuario'
      },
      { status: 500 }
    );
  }
}

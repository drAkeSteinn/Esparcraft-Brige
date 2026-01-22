import { NextRequest, NextResponse } from 'next/server';
import {
  updateAllAreas,
  updatePuebloArea,
  updateWorldArea,
  getAreaStats
} from '@/lib/boundingBoxUtils';

/**
 * API para calcular y actualizar los bounding boxes de mundos y pueblos
 *
 * GET /api/boundingBox - Actualiza todas las áreas y devuelve estadísticas
 * POST /api/boundingBox - Actualiza áreas específicas (pueblo o mundo)
 *   Body: { type: 'pueblo' | 'world' | 'all', id?: string }
 */

// GET: Actualiza todas las áreas
export async function GET() {
  try {
    const stats = updateAllAreas();

    return NextResponse.json({
      success: true,
      message: 'Áreas actualizadas correctamente',
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating bounding boxes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update bounding boxes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Actualiza áreas específicas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: type'
        },
        { status: 400 }
      );
    }

    let result;
    let message;

    switch (type) {
      case 'pueblo':
        if (!id) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required field: id (for pueblo type)'
            },
            { status: 400 }
          );
        }
        result = updatePuebloArea(id);
        if (result && result.area) {
          message = `Área del pueblo ${result.name} actualizada`;
        } else {
          message = result
            ? `Pueblo ${result.name} no tiene edificaciones, área eliminada`
            : 'Pueblo no encontrado';
        }
        break;

      case 'world':
        if (!id) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required field: id (for world type)'
            },
            { status: 400 }
          );
        }
        result = updateWorldArea(id);
        if (result && (result as any).area) {
          message = `Área del mundo ${result.name} actualizada`;
        } else {
          message = result
            ? `Mundo ${result.name} no tiene pueblos con edificaciones, área eliminada`
            : 'Mundo no encontrado';
        }
        break;

      case 'all':
        const stats = updateAllAreas();
        message = `Áreas actualizadas: ${stats.pueblosUpdated}/${stats.pueblosTotal} pueblos, ${stats.mundosUpdated}/${stats.mundosTotal} mundos`;
        result = stats;
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid type. Must be "pueblo", "world", or "all"'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message,
      data: result
    });
  } catch (error) {
    console.error('Error updating bounding box:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update bounding box',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

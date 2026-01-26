import { NextRequest, NextResponse } from 'next/server';
import { templateCache } from '@/lib/templateCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Obtener estadísticas del cache
    if (action === 'stats') {
      const stats = templateCache.getStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // Limpiar cache expirado
    if (action === 'clean') {
      const cleaned = templateCache.cleanExpired();
      return NextResponse.json({
        success: true,
        data: { cleaned }
      });
    }

    // Limpiar todo el cache
    if (action === 'clear') {
      templateCache.invalidateAll();
      return NextResponse.json({
        success: true,
        message: 'Cache limpiado completamente'
      });
    }

    // Por defecto, retornar estadísticas
    const stats = templateCache.getStats();
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener estadísticas del cache'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    templateCache.invalidateAll();
    return NextResponse.json({
      success: true,
      message: 'Cache limpiado completamente'
    });
  } catch (error) {
    console.error('Error al limpiar el cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al limpiar el cache'
    }, { status: 500 });
  }
}

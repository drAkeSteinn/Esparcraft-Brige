import { NextRequest, NextResponse } from 'next/server';
import { grimorioStats } from '@/lib/grimorioStats';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Obtener estadísticas generales
    if (action === 'stats' || !action) {
      const stats = grimorioStats.getStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // Obtener reporte detallado
    if (action === 'report') {
      const report = grimorioStats.generateReport();
      return NextResponse.json({
        success: true,
        data: {
          report,
          stats: grimorioStats.getStats()
        }
      });
    }

    // Obtener logs recientes
    if (action === 'logs') {
      const recentLogs = grimorioStats.getRecentLogs(limit);
      return NextResponse.json({
        success: true,
        data: {
          logs: recentLogs,
          total: recentLogs.length
        }
      });
    }

    // Obtener logs por tipo
    if (action === 'logs-by-type' && type) {
      const typeLogs = grimorioStats.getLogsByType(type as any, limit);
      return NextResponse.json({
        success: true,
        data: {
          logs: typeLogs,
          total: typeLogs.length,
          type
        }
      });
    }

    // Obtener logs de errores
    if (action === 'errors') {
      const errorLogs = grimorioStats.getErrorLogs(limit);
      return NextResponse.json({
        success: true,
        data: {
          logs: errorLogs,
          total: errorLogs.length
        }
      });
    }

    // Obtener variables más usadas
    if (action === 'top-variables') {
      const topVariables = grimorioStats.getTopVariables(limit);
      return NextResponse.json({
        success: true,
        data: {
          topVariables,
          total: topVariables.length
        }
      });
    }

    // Por defecto, retornar estadísticas
    const stats = grimorioStats.getStats();
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del Grimorio:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener estadísticas del Grimorio'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    grimorioStats.reset();
    return NextResponse.json({
      success: true,
      message: 'Estadísticas del Grimorio reiniciadas'
    });
  } catch (error) {
    console.error('Error al reiniciar estadísticas del Grimorio:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al reiniciar estadísticas del Grimorio'
    }, { status: 500 });
  }
}

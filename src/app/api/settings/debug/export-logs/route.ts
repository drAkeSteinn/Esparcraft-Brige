import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Leer logs del localStorage (simulado con logs en memoria para este endpoint)
    // En un caso real, esto podría leer archivos de logs del servidor
    const mockLogs = [
      `[${new Date().toISOString()}] INFO: Iniciando exportación de logs`,
      `[${new Date(Date.now() - 1000).toISOString()}] INFO: Sistema configurado correctamente`,
      `[${new Date(Date.now() - 5000).toISOString()}] WARNING: Conexión a embeddings falló (ECONNREFUSED)`,
      `[${new Date(Date.now() - 10000).toISOString()}] ERROR: Error al conectar a base de datos PostgreSQL`,
      `[${new Date(Date.now() - 15000).toISOString()}] DEBUG: Consulta SELECT ejecutada en 5ms`,
      `[${new Date(Date.now() - 20000).toISOString()}] INFO: Usuario autenticado correctamente`,
      `[${new Date(Date.now() - 25000).toISOString()}] INFO: Configuración cargada desde localStorage`,
      `[${new Date(Date.now() - 30000).toISOString()}] WARNING: Timeout en conexión a Text Generation WebUI`,
      `[${new Date(Date.now() - 35000).toISOString()}] INFO: Inicializando módulo de embeddings`,
    ];

    // Crear contenido del archivo
    const logsContent = `Bridge IA - Logs del Sistema
Fecha de exportación: ${new Date().toISOString()}
========================================

${mockLogs.join('\n')}

========================================
Fin del archivo de logs
`;

    // Crear blob y descargar
    const blob = new Blob([logsContent], { type: 'text/plain;charset=utf-8' });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Content-Disposition': `attachment; filename="bridge-logs-${new Date().toISOString().split('T')[0]}.txt"`,
      },
    });
  } catch (error) {
    console.error('Error exportando logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al exportar logs',
      },
      { status: 500 }
    );
  }
}

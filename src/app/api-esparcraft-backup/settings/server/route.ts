import { NextRequest, NextResponse } from 'next/server';

interface ServerConfig {
  name: string;
  description: string;
  version: string;
  maintenanceMode: boolean;
}

// Configuración en memoria del servidor
let serverConfig: ServerConfig = {
  name: 'Esparcraft',
  description: 'Bridge IA - Gestor Narrativo del Servidor Esparcraft',
  version: '1.0.0',
  maintenanceMode: false,
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: serverConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: ServerConfig = await request.json();

    // Validar campos requeridos
    if (!config.name || typeof config.name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Nombre del servidor es requerido',
        },
        { status: 400 }
      );
    }

    if (!config.version || typeof config.version !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Versión del sistema es requerida',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    serverConfig = {
      name: config.name,
      description: config.description || '',
      version: config.version,
      maintenanceMode: config.maintenanceMode || false,
    };

    console.log('Configuración del servidor actualizada:', serverConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración del servidor aplicada correctamente',
        config: serverConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración del servidor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración del servidor',
      },
      { status: 500 }
    );
  }
}

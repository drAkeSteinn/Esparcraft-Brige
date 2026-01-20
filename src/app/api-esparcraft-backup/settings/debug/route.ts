import { NextRequest, NextResponse } from 'next/server';

interface DebugConfig {
  debugMode: boolean;
  logLevel: 'error' | 'warning' | 'info' | 'debug';
  consoleInInterface: boolean;
  autoSaveLogs: boolean;
}

// Configuración en memoria de depuración
let debugConfig: DebugConfig = {
  debugMode: false,
  logLevel: 'error',
  consoleInInterface: false,
  autoSaveLogs: false,
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: debugConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: DebugConfig = await request.json();

    // Validar debugMode
    if (typeof config.debugMode !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Modo debug debe ser un valor booleano',
        },
        { status: 400 }
      );
    }

    // Validar logLevel
    if (
      !config.logLevel ||
      !['error', 'warning', 'info', 'debug'].includes(config.logLevel)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nivel de log no válido. Debe ser error, warning, info o debug',
        },
        { status: 400 }
      );
    }

    // Validar consoleInInterface
    if (typeof config.consoleInInterface !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Console in interface debe ser un valor booleano',
        },
        { status: 400 }
      );
    }

    // Validar autoSaveLogs
    if (typeof config.autoSaveLogs !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Auto save logs debe ser un valor booleano',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    debugConfig = {
      debugMode: config.debugMode ?? false,
      logLevel: config.logLevel ?? 'error',
      consoleInInterface: config.consoleInInterface ?? false,
      autoSaveLogs: config.autoSaveLogs ?? false,
    };

    console.log('Configuración de depuración actualizada:', debugConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de depuración aplicada correctamente',
        config: debugConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de depuración:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de depuración',
      },
      { status: 500 }
    );
  }
}

// Función helper para obtener la configuración actual (para usar en otros módulos)
export function getDebugConfig(): DebugConfig {
  return debugConfig;
}

export function updateDebugConfig(updates: Partial<DebugConfig>): void {
  debugConfig = {
    ...debugConfig,
    ...updates,
  };
}

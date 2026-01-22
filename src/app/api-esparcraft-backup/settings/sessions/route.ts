import { NextRequest, NextResponse } from 'next/server';

interface SessionConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  maxMessageHistory: number;
  sessionsPerPage: number;
  inactivityTimeout: number;
}

// Configuración en memoria de sesiones
let sessionConfig: SessionConfig = {
  autoSave: true,
  autoSaveInterval: 30,
  maxMessageHistory: 100,
  sessionsPerPage: 12,
  inactivityTimeout: 300,
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: sessionConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: SessionConfig = await request.json();

    // Validar autoSave
    if (typeof config.autoSave !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Auto-save debe ser un valor booleano',
        },
        { status: 400 }
      );
    }

    // Validar intervalo de auto-save
    if (
      typeof config.autoSaveInterval !== 'number' ||
      config.autoSaveInterval < 10 ||
      config.autoSaveInterval > 600
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Intervalo de auto-save debe ser un número entre 10 y 600 segundos',
        },
        { status: 400 }
      );
    }

    // Validar historial máximo
    if (
      typeof config.maxMessageHistory !== 'number' ||
      config.maxMessageHistory < 10 ||
      config.maxMessageHistory > 10000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Historial máximo debe ser un número entre 10 y 10000 mensajes',
        },
        { status: 400 }
      );
    }

    // Validar sesiones por página
    if (
      typeof config.sessionsPerPage !== 'number' ||
      config.sessionsPerPage < 3 ||
      config.sessionsPerPage > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sesiones por página debe ser un número entre 3 y 50',
        },
        { status: 400 }
      );
    }

    // Validar timeout de inactividad
    if (
      typeof config.inactivityTimeout !== 'number' ||
      config.inactivityTimeout < 30 ||
      config.inactivityTimeout > 7200
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Timeout de inactividad debe ser un número entre 30 y 7200 segundos',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    sessionConfig = {
      autoSave: config.autoSave ?? true,
      autoSaveInterval: config.autoSaveInterval ?? 30,
      maxMessageHistory: config.maxMessageHistory ?? 100,
      sessionsPerPage: config.sessionsPerPage ?? 12,
      inactivityTimeout: config.inactivityTimeout ?? 300,
    };

    console.log('Configuración de sesiones actualizada:', sessionConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de sesiones aplicada correctamente',
        config: sessionConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de sesiones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de sesiones',
      },
      { status: 500 }
    );
  }
}

// Función helper para obtener la configuración actual (para usar en otros módulos)
export function getSessionConfig(): SessionConfig {
  return sessionConfig;
}

export function updateSessionConfig(updates: Partial<SessionConfig>): void {
  sessionConfig = {
    ...sessionConfig,
    ...updates,
  };
}

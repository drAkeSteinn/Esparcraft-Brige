import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionConfig,
  updateSessionConfig,
  type SessionConfig,
} from '@/lib/sessionConfig';

interface SessionConfigPayload {
  autoSave?: boolean;
  autoSaveInterval?: number;
  maxMessageHistory?: number;
  sessionsPerPage?: number;
  inactivityTimeout?: number;
  minMessagesToSummarize?: number;
  keepMessagesAfterSummary?: number;
  autoSummarize?: boolean;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getSessionConfig(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: SessionConfigPayload = await request.json();

    // Validar autoSave
    if (config.autoSave !== undefined && typeof config.autoSave !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Auto-save debe ser un valor booleano' },
        { status: 400 }
      );
    }

    // Validar intervalo de auto-save
    if (
      config.autoSaveInterval !== undefined &&
      (typeof config.autoSaveInterval !== 'number' ||
        config.autoSaveInterval < 10 ||
        config.autoSaveInterval > 600)
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
      config.maxMessageHistory !== undefined &&
      (typeof config.maxMessageHistory !== 'number' ||
        config.maxMessageHistory < 10 ||
        config.maxMessageHistory > 10000)
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
      config.sessionsPerPage !== undefined &&
      (typeof config.sessionsPerPage !== 'number' ||
        config.sessionsPerPage < 3 ||
        config.sessionsPerPage > 50)
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
      config.inactivityTimeout !== undefined &&
      (typeof config.inactivityTimeout !== 'number' ||
        config.inactivityTimeout < 30 ||
        config.inactivityTimeout > 7200)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Timeout de inactividad debe ser un número entre 30 y 7200 segundos',
        },
        { status: 400 }
      );
    }

    // Validar minMessagesToSummarize
    if (
      config.minMessagesToSummarize !== undefined &&
      (typeof config.minMessagesToSummarize !== 'number' ||
        config.minMessagesToSummarize < 1 ||
        config.minMessagesToSummarize > 1000)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mínimo de mensajes para resumir debe ser un número entre 1 y 1000',
        },
        { status: 400 }
      );
    }

    // Validar keepMessagesAfterSummary
    if (
      config.keepMessagesAfterSummary !== undefined &&
      (typeof config.keepMessagesAfterSummary !== 'number' ||
        config.keepMessagesAfterSummary < 0 ||
        config.keepMessagesAfterSummary > 1000)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mensajes a conservar debe ser un número entre 0 y 1000',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración (fusiona con la existente)
    const current = getSessionConfig();
    const newConfig: SessionConfig = {
      autoSave: config.autoSave ?? current.autoSave,
      autoSaveInterval: config.autoSaveInterval ?? current.autoSaveInterval,
      maxMessageHistory: config.maxMessageHistory ?? current.maxMessageHistory,
      sessionsPerPage: config.sessionsPerPage ?? current.sessionsPerPage,
      inactivityTimeout: config.inactivityTimeout ?? current.inactivityTimeout,
      minMessagesToSummarize: config.minMessagesToSummarize ?? current.minMessagesToSummarize,
      keepMessagesAfterSummary: config.keepMessagesAfterSummary ?? current.keepMessagesAfterSummary,
      autoSummarize: config.autoSummarize ?? current.autoSummarize,
    };

    // Validación cruzada: keepMessagesAfterSummary debe ser < minMessagesToSummarize
    // (si no, el sistema entraría en un bucle infinito de resúmenes)
    if (newConfig.keepMessagesAfterSummary >= newConfig.minMessagesToSummarize) {
      return NextResponse.json(
        {
          success: false,
          error: `Los mensajes a conservar (${newConfig.keepMessagesAfterSummary}) deben ser menores que el mínimo para resumir (${newConfig.minMessagesToSummarize}). Si conserva todos los mensajes necesarios para resumir, el sistema entraría en un bucle.`,
        },
        { status: 400 }
      );
    }

    updateSessionConfig(newConfig);

    console.log('Configuración de sesiones actualizada:', newConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de sesiones aplicada correctamente',
        config: newConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de sesiones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al aplicar la configuración de sesiones' },
      { status: 500 }
    );
  }
}

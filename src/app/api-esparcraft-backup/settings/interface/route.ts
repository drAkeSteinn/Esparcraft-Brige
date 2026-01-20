import { NextRequest, NextResponse } from 'next/server';

interface InterfaceConfig {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  density: 'compact' | 'normal';
}

// Configuración en memoria de la interfaz
let interfaceConfig: InterfaceConfig = {
  theme: 'system',
  language: 'es',
  fontSize: 'medium',
  animations: true,
  density: 'normal',
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: interfaceConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: InterfaceConfig = await request.json();

    // Validar tema
    if (
      !config.theme ||
      !['light', 'dark', 'system'].includes(config.theme)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tema no válido. Debe ser light, dark o system',
        },
        { status: 400 }
      );
    }

    // Validar idioma
    if (!config.language || typeof config.language !== 'string' || config.language.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Idioma no válido. Debe ser un código ISO de 2 letras',
        },
        { status: 400 }
      );
    }

    // Validar tamaño de fuente
    if (
      !config.fontSize ||
      !['small', 'medium', 'large'].includes(config.fontSize)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tamaño de fuente no válido. Debe ser small, medium o large',
        },
        { status: 400 }
      );
    }

    // Validar densidad
    if (!config.density || !['compact', 'normal'].includes(config.density)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Densidad no válida. Debe ser compact o normal',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    interfaceConfig = {
      theme: config.theme,
      language: config.language,
      fontSize: config.fontSize,
      animations: config.animations ?? true,
      density: config.density,
    };

    console.log('Configuración de la interfaz actualizada:', interfaceConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de la interfaz aplicada correctamente',
        config: interfaceConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de la interfaz:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de la interfaz',
      },
      { status: 500 }
    );
  }
}

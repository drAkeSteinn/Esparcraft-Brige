import { NextRequest, NextResponse } from 'next/server';

interface FilesConfig {
  basePath: string;
  maxFileSize: number;
  allowedFormats: {
    images: boolean;
    documents: boolean;
    json: boolean;
    text: boolean;
    markdown: boolean;
  };
}

// Configuración en memoria de archivos
let filesConfig: FilesConfig = {
  basePath: '/data',
  maxFileSize: 10,
  allowedFormats: {
    images: true,
    documents: true,
    json: true,
    text: false,
    markdown: false,
  },
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: filesConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: FilesConfig = await request.json();

    // Validar ruta base
    if (!config.basePath || typeof config.basePath !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'La ruta base es requerida',
        },
        { status: 400 }
      );
    }

    // Validar límite de tamaño
    if (
      typeof config.maxFileSize !== 'number' ||
      config.maxFileSize < 1 ||
      config.maxFileSize > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'El límite de tamaño debe ser un número entre 1 y 500 MB',
        },
        { status: 400 }
      );
    }

    // Validar formatos permitidos
    if (
      !config.allowedFormats ||
      typeof config.allowedFormats !== 'object' ||
      !config.allowedFormats.images ||
      !config.allowedFormats.documents ||
      !config.allowedFormats.json ||
      !config.allowedFormats.text ||
      !config.allowedFormats.markdown
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Los formatos permitidos son requeridos',
        },
        { status: 400 }
      );
    }

    // Verificar que al menos un formato esté habilitado
    const anyEnabled = Object.values(config.allowedFormats || {}).some(v => v);
    if (!anyEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe seleccionar al menos un formato de archivo',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    filesConfig = {
      basePath: config.basePath,
      maxFileSize: config.maxFileSize,
      allowedFormats: config.allowedFormats,
    };

    console.log('Configuración de archivos actualizada:', filesConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de archivos aplicada correctamente',
        config: filesConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de archivos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de archivos',
      },
      { status: 500 }
    );
  }
}

// Función helper para obtener la configuración actual (para usar en otros módulos)
export function getFilesConfig(): FilesConfig {
  return filesConfig;
}

export function updateFilesConfig(updates: Partial<FilesConfig>): void {
  filesConfig = {
    ...filesConfig,
    ...updates,
  };
}

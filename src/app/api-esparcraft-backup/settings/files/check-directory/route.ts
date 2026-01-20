import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { directory } = await request.json();

    if (!directory || typeof directory !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Directorio es requerido',
        },
        { status: 400 }
      );
    }

    // Verificar si el directorio existe
    const exists = existsSync(directory);

    let fileCount = 0;
    let subdirectories = 0;
    let totalSize = 0;

    if (exists) {
      try {
        const files = readdirSync(directory);
        fileCount = files.length;

        // Contar subdirectorios y calcular tamaño aproximado
        for (const file of files) {
          const filePath = join(directory, file);
          if (existsSync(filePath)) {
            // Si no tiene extensión, asumir que es un subdirectorio
            if (!file.includes('.')) {
              subdirectories++;
            }
          }
        }
      } catch (err) {
        console.error('Error leyendo directorio:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        exists,
        fileCount,
        subdirectories,
        totalSize,
        directory,
      },
    });
  } catch (error) {
    console.error('Error verificando directorio:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al verificar el directorio',
      },
      { status: 500 }
    );
  }
}

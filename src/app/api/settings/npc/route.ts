import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

interface NPCConfig {
  exportFormat: 'sillytavern' | 'json' | 'txt';
  imagesDirectory: string;
  defaultAvatar: string;
  npcsPerPage: number;
}

// Configuración en memoria de NPCs
let npcConfig: NPCConfig = {
  exportFormat: 'sillytavern',
  imagesDirectory: '/data/npcs/avatars',
  defaultAvatar: '/data/npcs/avatars/default.png',
  npcsPerPage: 12,
};

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: npcConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config: NPCConfig = await request.json();

    // Validar formato de exportación
    if (
      !config.exportFormat ||
      !['sillytavern', 'json', 'txt'].includes(config.exportFormat)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de exportación no válido. Debe ser sillytavern, json o txt',
        },
        { status: 400 }
      );
    }

    // Validar directorio de imágenes
    if (!config.imagesDirectory || typeof config.imagesDirectory !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'El directorio de imágenes es requerido',
        },
        { status: 400 }
      );
    }

    // Validar avatar por defecto
    if (!config.defaultAvatar || typeof config.defaultAvatar !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'El avatar por defecto es requerido',
        },
        { status: 400 }
      );
    }

    // Validar NPCs por página
    if (
      !config.npcsPerPage ||
      typeof config.npcsPerPage !== 'number' ||
      config.npcsPerPage < 6 ||
      config.npcsPerPage > 36
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'NPCs por página debe ser un número entre 6 y 36',
        },
        { status: 400 }
      );
    }

    // Actualizar configuración
    npcConfig = {
      exportFormat: config.exportFormat,
      imagesDirectory: config.imagesDirectory,
      defaultAvatar: config.defaultAvatar,
      npcsPerPage: config.npcsPerPage,
    };

    console.log('Configuración de NPCs actualizada:', npcConfig);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Configuración de NPCs aplicada correctamente',
        config: npcConfig,
      },
    });
  } catch (error) {
    console.error('Error aplicando configuración de NPCs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al aplicar la configuración de NPCs',
      },
      { status: 500 }
    );
  }
}

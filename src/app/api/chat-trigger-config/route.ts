import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Ruta del archivo de configuración
const CONFIG_FILE = path.join(process.cwd(), 'db', 'chat-trigger-config.json');

interface GrimorioTemplateConfig {
  enabled: boolean;
  templateKey?: string;
  section: string;
}

interface ChatTriggerConfig {
  grimorioTemplates: GrimorioTemplateConfig[];
}

/**
 * GET - Cargar configuración de Chat Trigger
 */
export async function GET() {
  try {
    // Verificar si existe el archivo de configuración
    try {
      const fileContent = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config: ChatTriggerConfig = JSON.parse(fileContent);
      return NextResponse.json({
        success: true,
        data: config
      });
    } catch (error) {
      // Si el archivo no existe, retornar configuración vacía
      return NextResponse.json({
        success: true,
        data: {
          grimorioTemplates: []
        }
      });
    }
  } catch (error) {
    console.error('Error loading chat trigger config:', error);
    return NextResponse.json({
      success: false,
      error: 'Error loading configuration'
    }, { status: 500 });
  }
}

/**
 * POST - Guardar configuración de Chat Trigger
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grimorioTemplates } = body;

    // Validar que grimorioTemplates sea un array
    if (!Array.isArray(grimorioTemplates)) {
      return NextResponse.json({
        success: false,
        error: 'grimorioTemplates must be an array'
      }, { status: 400 });
    }

    // Crear el objeto de configuración
    const config: ChatTriggerConfig = {
      grimorioTemplates
    };

    // Asegurar que el directorio db existe
    const dbDir = path.join(process.cwd(), 'db');
    try {
      await fs.access(dbDir);
    } catch {
      await fs.mkdir(dbDir, { recursive: true });
    }

    // Guardar la configuración en el archivo
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving chat trigger config:', error);
    return NextResponse.json({
      success: false,
      error: 'Error saving configuration'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Ruta del archivo de configuración
const CONFIG_PATH = path.join(process.cwd(), 'db', 'resumen-sesion-trigger-config.json');
const DB_DIR = path.join(process.cwd(), 'db');

// GET: Leer la configuración
export async function GET() {
  try {
    console.log('[resumen-sesion-trigger-config GET] Intentando leer:', CONFIG_PATH);

    // Verificar si el archivo existe
    try {
      await fs.access(CONFIG_PATH);
      console.log('[resumen-sesion-trigger-config GET] El archivo existe, procediendo a leer');
    } catch {
      console.log('[resumen-sesion-trigger-config GET] El archivo no existe, retornar configuración vacía');
      return NextResponse.json({
        success: true,
        data: { systemPrompt: '' }
      });
    }

    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);

    console.log('[resumen-sesion-trigger-config GET] Configuración cargada exitosamente');
    console.log('[resumen-sesion-trigger-config GET] systemPrompt:', config.systemPrompt?.substring(0, 50) || '(vacío)');

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[resumen-sesion-trigger-config GET] Error:', error);
    console.error('[resumen-sesion-trigger-config GET] Error message:', error.message);
    return NextResponse.json(
      { success: false, error: 'Error al leer la configuración: ' + error.message },
      { status: 500 }
    );
  }
}

// POST: Guardar la configuración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemPrompt } = body;

    console.log('[resumen-sesion-trigger-config POST] === INICIO ===');
    console.log('[resumen-sesion-trigger-config POST] systemPrompt recibido:', systemPrompt?.substring(0, 50) || '(vacío)');
    console.log('[resumen-sesion-trigger-config POST] typeof systemPrompt:', typeof systemPrompt);

    // Validar que sea un string
    if (typeof systemPrompt !== 'string') {
      console.error('[resumen-sesion-trigger-config POST] Error: systemPrompt no es un string');
      return NextResponse.json(
        { success: false, error: 'systemPrompt debe ser un string' },
        { status: 400 }
      );
    }

    // Asegurar que el directorio db existe
    try {
      await fs.access(DB_DIR);
      console.log('[resumen-sesion-trigger-config POST] Directorio db existe');
    } catch {
      console.log('[resumen-sesion-trigger-config POST] Creando directorio db...');
      await fs.mkdir(DB_DIR, { recursive: true, mode: 0o755 }); // Permisos: rwxr-xr-x
      console.log('[resumen-sesion-trigger-config POST] Directorio db creado con permisos');
    }

    // Verificar si el archivo existe y sus permisos
    let fileExists = false;
    try {
      await fs.access(CONFIG_PATH, fs.constants.W_OK);
      fileExists = true;
      console.log('[resumen-sesion-trigger-config POST] El archivo ya existe');
    } catch {
      console.log('[resumen-sesion-trigger-config POST] El archivo no existe');
    }

    // Guardar configuración
    const config = { systemPrompt };

    console.log('[resumen-sesion-trigger-config POST] Intentando escribir configuración...');

    try {
      // Si el archivo existe, intentar truncar primero
      if (fileExists) {
        console.log('[resumen-sesion-trigger-config POST] Truncando archivo existente...');
        await fs.truncate(CONFIG_PATH, 0);
      }

      await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('[resumen-sesion-trigger-config POST] ✅ Configuración guardada exitosamente');
    } catch (writeError) {
      console.error('[resumen-sesion-trigger-config POST] Error escribiendo archivo:', writeError);
      console.error('[resumen-sesion-trigger-config POST] Error message:', writeError.message);
      console.error('[resumen-sesion-trigger-config POST] Error code:', writeError.code);
      return NextResponse.json(
        { success: false, error: 'Error al guardar la configuración: ' + writeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[resumen-sesion-trigger-config POST] Error general:', error);
    console.error('[resumen-sesion-trigger-config POST] Error message:', error.message);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la configuración: ' + error.message },
      { status: 500 }
    );
  }
}

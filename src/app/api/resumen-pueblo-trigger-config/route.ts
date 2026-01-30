import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Ruta del archivo de configuración
const CONFIG_PATH = path.join(process.cwd(), 'db', 'resumen-pueblo-trigger-config.json');
const DB_DIR = path.join(process.cwd(), 'db');

// GET: Leer la configuración
export async function GET() {
  try {
    console.log('[resumen-pueblo-trigger-config GET] Intentando leer:', CONFIG_PATH);

    // Verificar si el archivo existe
    try {
      await fs.access(CONFIG_PATH);
      console.log('[resumen-pueblo-trigger-config GET] El archivo existe, procediendo a leer');
    } catch {
      console.log('[resumen-pueblo-trigger-config GET] El archivo no existe, retornar configuración vacía');
      return NextResponse.json({
        success: true,
        data: { systemPrompt: '' }
      });
    }

    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);

    console.log('[resumen-pueblo-trigger-config GET] Configuración cargada exitosamente');
    console.log('[resumen-pueblo-trigger-config GET] systemPrompt:', config.systemPrompt?.substring(0, 50) || '(vacío)');

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[resumen-pueblo-trigger-config GET] Error:', error);
    console.error('[resumen-pueblo-trigger-config GET] Error message:', error.message);
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

    console.log('[resumen-pueblo-trigger-config POST] === INICIO ===');
    console.log('[resumen-pueblo-trigger-config POST] systemPrompt recibido:', systemPrompt?.substring(0, 50) || '(vacío)');
    console.log('[resumen-pueblo-trigger-config POST] typeof systemPrompt:', typeof systemPrompt);

    // Validar que sea un string
    if (typeof systemPrompt !== 'string') {
      console.error('[resumen-pueblo-trigger-config POST] Error: systemPrompt no es un string');
      return NextResponse.json(
        { success: false, error: 'systemPrompt debe ser un string' },
        { status: 400 }
      );
    }

    // Asegurar que el directorio db existe
    try {
      await fs.access(DB_DIR);
      console.log('[resumen-pueblo-trigger-config POST] Directorio db existe');
    } catch {
      console.log('[resumen-pueblo-trigger-config POST] Creando directorio db...');
      await fs.mkdir(DB_DIR, { recursive: true, mode: 0o755 }); // Permisos: rwxr-xr-x
      console.log('[resumen-pueblo-trigger-config POST] Directorio db creado con permisos');
    }

    // Verificar si el archivo existe y sus permisos
    let fileExists = false;
    try {
      await fs.access(CONFIG_PATH, fs.constants.W_OK);
      fileExists = true;
      console.log('[resumen-pueblo-trigger-config POST] El archivo ya existe');
    } catch {
      console.log('[resumen-pueblo-trigger-config POST] El archivo no existe o no es escribible');
      // Si el archivo existe pero no es escribible, intentar eliminarlo
      try {
        await fs.unlink(CONFIG_PATH);
        console.log('[resumen-pueblo-trigger-config POST] Archivo con permisos incorrectos eliminado');
      } catch (unlinkError) {
        console.log('[resumen-pueblo-trigger-config POST] Archivo no existe, no se necesita eliminar');
      }
    }

    // Guardar configuración
    const config = { systemPrompt };

    console.log('[resumen-pueblo-trigger-config POST] Intentando escribir configuración...');

    try {
      // Asegurarnos de que el archivo no existe antes de escribir
      try {
        await fs.unlink(CONFIG_PATH);
        console.log('[resumen-pueblo-trigger-config POST] Archivo preexistente eliminado');
      } catch {
        // No existe, no hay problema
      }

      await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o664 });
      console.log('[resumen-pueblo-trigger-config POST] ✅ Configuración guardada exitosamente');
    } catch (writeError) {
      console.error('[resumen-pueblo-trigger-config POST] Error escribiendo archivo:', writeError);
      console.error('[resumen-pueblo-trigger-config POST] Error message:', writeError.message);
      console.error('[resumen-pueblo-trigger-config POST] Error code:', writeError.code);
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
    console.error('[resumen-pueblo-trigger-config POST] Error general:', error);
    console.error('[resumen-pueblo-trigger-config POST] Error message:', error.message);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la configuración: ' + error.message },
      { status: 500 }
    );
  }
}

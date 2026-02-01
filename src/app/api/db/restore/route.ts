import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// POST /api/db/restore - Restaurar un backup específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes especificar el nombre del archivo de backup a restaurar'
        },
        { status: 400 }
      );
    }

    const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');
    const backupPath = join(backupDir, filename);
    const dbDir = join(process.cwd(), 'db');
    const dbFile = join(dbDir, 'custom.db');

    // Verificar que el archivo de backup existe
    if (!existsSync(backupPath)) {
      return NextResponse.json(
        {
          success: false,
          error: `El archivo de backup no existe: ${filename}`
        },
        { status: 404 }
      );
    }

    // Verificar que el directorio de backups existe
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Paso 1: Crear backup del estado actual ANTES de restaurar
    if (existsSync(dbFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const preRestoreBackup = join(backupDir, `custom.db.before-restore-${timestamp}`);

      try {
        const currentDbData = readFileSync(dbFile);
        writeFileSync(preRestoreBackup, currentDbData);
        console.log(`Backup pre-restauración creado: ${preRestoreBackup}`);
      } catch (error) {
        console.error('Error creando backup pre-restauración:', error);
      }
    }

    // Paso 2: Obtener información del backup a restaurar
    const backupStats = statSync(backupPath);
    const backupSize = backupStats.size;

    // Extraer tipo de backup
    const isManual = filename.includes('-manual-');

    // Paso 3: Copiar el backup al archivo actual
    const backupData = readFileSync(backupPath);
    writeFileSync(dbFile, backupData);

    // Paso 4: Verificar integridad del archivo restaurado
    const restoredStats = statSync(dbFile);
    const restoredSize = restoredStats.size;

    const sizeMatch = restoredSize === backupSize;

    return NextResponse.json({
      success: true,
      data: {
        filename,
        restored: true,
        sizeMatch,
        size: backupSize,
        isManual,
        message: isManual 
          ? `Backup manual "${filename}" restaurado` 
          : `Backup automático "${filename}" restaurado`
      },
      message: `Base de datos restaurada desde "${filename}"`
    });
  } catch (error) {
    console.error('Error restaurando backup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error restaurando backup'
      },
      { status: 500 }
    );
  }
}

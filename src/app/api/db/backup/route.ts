import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// POST /api/db/backup - Crear un nuevo backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name?.trim();

    const dbDir = join(process.cwd(), 'db');
    const dbFile = join(dbDir, 'custom.db');
    const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

    // Verificar que la base de datos existe
    if (!existsSync(dbFile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'La base de datos no existe'
        },
        { status: 404 }
      );
    }

    // Crear directorio de backup si no existe
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Generar nombre de archivo con timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
    let backupFileName: string;

    if (name) {
      // Backup manual con nombre personalizado
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
      backupFileName = `custom.db.${timestamp}-manual-${safeName}`;
    } else {
      // Backup automático
      backupFileName = `custom.db.${timestamp}`;
    }

    const backupPath = join(backupDir, backupFileName);

    // Leer y copiar base de datos
    const dbData = readFileSync(dbFile);
    writeFileSync(backupPath, dbData);

    // Limpieza automática: mantener solo los últimos 20
    const backupFiles = readdirSync(backupDir)
      .filter(file => file.startsWith('custom.db.'))
      .sort((a, b) => b.localeCompare(a)); // Más recientes primero

    if (backupFiles.length > 20) {
      const filesToDelete = backupFiles.slice(20);
      filesToDelete.forEach(file => {
        const filePath = join(backupDir, file);
        try {
          require('fs').unlinkSync(filePath);
          console.log(`Backup antiguo eliminado: ${file}`);
        } catch (error) {
          console.error(`Error eliminando backup antiguo ${file}:`, error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        filename: backupFileName,
        timestamp,
        size: dbData.length,
        isManual: !!name,
        backupName: name || null
      },
      message: name 
        ? `Backup "${name}" creado exitosamente` 
        : 'Backup automático creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando backup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error creando backup'
      },
      { status: 500 }
    );
  }
}

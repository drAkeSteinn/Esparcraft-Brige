import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// GET /api/db/backups - Listar todos los backups disponibles
export async function GET() {
  try {
    const backupDir = join(process.cwd(), 'data-esparcraft', 'db-backup');

    // Verificar que el directorio existe
    if (!existsSync(backupDir)) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No hay directorio de backups'
      });
    }

    // Leer archivos de backups
    const files = readdirSync(backupDir)
      .filter(file => file.startsWith('custom.db.'))
      .sort((a, b) => b.localeCompare(a)); // Ordenar descendente por nombre

    // Obtener información de cada backup
    const backups = files.map(filename => {
      const fullPath = join(backupDir, filename);

      try {
        const stats = statSync(fullPath);
        const size = stats.size;

        // Extraer timestamp del nombre del archivo
        let timestamp = '';
        let isManual = false;

        if (filename.includes('-manual-')) {
          isManual = true;
          const parts = filename.replace('custom.db.', '').split('-manual-');
          timestamp = parts[0];
        } else {
          timestamp = filename.replace('custom.db.', '');
        }

        // Intentar convertir timestamp a fecha legible
        let isoDate = '';
        try {
          const cleanTimestamp = timestamp.replace(/[T-]/g, '').replace(/_/g, '');

          if (cleanTimestamp.length >= 14) {
            const year = cleanTimestamp.substring(0, 4);
            const month = cleanTimestamp.substring(4, 6);
            const day = cleanTimestamp.substring(6, 8);
            const hour = cleanTimestamp.substring(8, 10);
            const minute = cleanTimestamp.substring(10, 12);
            const second = cleanTimestamp.substring(12, 14);

            isoDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
          }
        } catch (error) {
          isoDate = timestamp;
        }

        // Generar nombre descriptivo
        let displayName = isoDate;
        if (filename.includes('-manual-')) {
          const namePart = filename.split('-manual-')[1];
          const cleanName = namePart.replace(/_/g, ' ');
          displayName = `${isoDate} (Manual: ${cleanName})`;
        }

        return {
          filename,
          timestamp,
          isoDate,
          size,
          sizeKB: Math.round(size / 1024),
          isManual,
          displayName
        };
      } catch (error) {
        return {
          filename,
          timestamp: '',
          isoDate: 'Error leyendo',
          size: 0,
          sizeKB: 0,
          isManual: false,
          displayName: filename
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error listando backups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error listando backups'
      },
      { status: 500 }
    );
  }
}

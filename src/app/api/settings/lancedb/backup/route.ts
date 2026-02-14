import { NextRequest, NextResponse } from 'next/server';
import {
  initLanceDB,
  exportToJSON,
  importFromJSON,
  isDBInitialized,
  isLanceDBAvailable
} from '@/lib/lancedb-db';

/**
 * GET /api/settings/lancedb/backup
 * Obtiene información sobre backups disponibles
 */
export async function GET() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const backupDir = path.join(process.cwd(), 'backups');
    const backups: { name: string; path: string; size: number; created: Date }[] = [];
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('lancedb_backup_') && f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        backupDirectory: backupDir,
        backups: backups.sort((a, b) => b.created.getTime() - a.created.getTime())
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/settings/lancedb/backup
 * Exporta todos los embeddings a JSON
 */
export async function POST() {
  try {
    // Verificar si LanceDB está disponible
    const { available, error: lancedbError } = await isLanceDBAvailable();
    
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'LanceDB no está disponible en este sistema',
        details: lancedbError,
        suggestion: 'Verifica que tu sistema sea compatible con LanceDB.'
      }, { status: 503 });
    }
    
    // Asegurar que LanceDB está inicializado
    if (!isDBInitialized()) {
      await initLanceDB();
    }
    
    // Exportar datos
    const backup = await exportToJSON();
    
    return NextResponse.json({
      success: true,
      data: {
        backup,
        message: `Backup exportado: ${backup.metadata.totalEmbeddings} embeddings, ${backup.metadata.totalNamespaces} namespaces`
      }
    });
  } catch (error: any) {
    console.error('Error al exportar backup:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al exportar backup',
      suggestion: error.getSuggestion?.() || undefined
    }, { status: 500 });
  }
}

/**
 * PUT /api/settings/lancedb/backup
 * Importa embeddings desde un backup JSON
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar si LanceDB está disponible
    const { available, error: lancedbError } = await isLanceDBAvailable();
    
    if (!available) {
      return NextResponse.json({
        success: false,
        error: 'LanceDB no está disponible en este sistema',
        details: lancedbError,
        suggestion: 'Verifica que tu sistema sea compatible con LanceDB.'
      }, { status: 503 });
    }
    
    const body = await request.json();
    const { backup, merge = true, clearExisting = false } = body;
    
    if (!backup || !backup.version || !backup.embeddings) {
      return NextResponse.json({
        success: false,
        error: 'Formato de backup inválido'
      }, { status: 400 });
    }
    
    // Asegurar que LanceDB está inicializado
    if (!isDBInitialized()) {
      await initLanceDB();
    }
    
    // Importar datos
    const result = await importFromJSON(backup, { merge, clearExisting });
    
    return NextResponse.json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        message: `Importación completada: ${result.imported} importados, ${result.skipped} omitidos`
      }
    });
  } catch (error: any) {
    console.error('Error al importar backup:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al importar backup',
      suggestion: error.getSuggestion?.() || undefined
    }, { status: 500 });
  }
}

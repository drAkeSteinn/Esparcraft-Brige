import { NextRequest, NextResponse } from 'next/server';
import { puebloDbManager } from '@/lib/puebloDbManager';
import { Pueblo } from '@/lib/types';

// POST - Importar todos los pueblos desde un archivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.data || !Array.isArray(body.data.items)) {
      return NextResponse.json(
        { error: 'Archivo inválido: no contiene items' },
        { status: 400 }
      );
    }

    const pueblos = body.data.items as Pueblo[];

    // Crear backup automático del estado actual antes de importar
    const currentPueblos = await puebloDbManager.getAll();
    if (currentPueblos.length > 0) {
      await createGenericBackup('pueblos', currentPueblos, 'auto', `pre-import-${Date.now()}`);
    }

    // Borrar todos los pueblos actuales
    await puebloDbManager.deleteAll();

    // Importar pueblos del archivo
    let importedCount = 0;
    for (const pueblo of pueblos) {
      try {
        await puebloDbManager.create(
          {
            name: pueblo.name,
            type: pueblo.type,
            description: pueblo.description,
            worldId: pueblo.worldId,
            lore: pueblo.lore,
            area: pueblo.area ? JSON.parse(pueblo.area) : undefined
          },
          pueblo.id
        );
        importedCount++;
      } catch (error) {
        console.error(`[API:pueblos/import-all] Error importando pueblo: ${pueblo.name}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} pueblos importados correctamente`,
      data: {
        importedCount
      }
    });
  } catch (error) {
    console.error('[API:pueblos/import-all] Error importing all pueblos:', error);
    return NextResponse.json(
      { error: 'Failed to import pueblos' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { edificioDbManager } from '@/lib/edificioDbManager';
import { Edificio } from '@/lib/types';
import { createGenericBackup } from '@/lib/genericBackupManager';

// POST - Importar todos los edificios desde un archivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.data || !Array.isArray(body.data.items)) {
      return NextResponse.json(
        { error: 'Archivo inválido: no contiene items' },
        { status: 400 }
      );
    }

    const edificios = body.data.items as Edificio[];

    // Crear backup automático del estado actual antes de importar
    const currentEdificios = await edificioDbManager.getAll();
    if (currentEdificios.length > 0) {
      await createGenericBackup('edificios', currentEdificios, 'auto', `pre-import-${Date.now()}`);
    }

    // Borrar todos los edificios actuales
    await edificioDbManager.deleteAll();

    // Importar edificios del archivo
    let importedCount = 0;
    for (const edificio of edificios) {
      try {
        await edificioDbManager.create(
          {
            name: edificio.name,
            description: edificio.description,
            worldId: edificio.worldId,
            puebloId: edificio.puebloId,
            lore: edificio.lore,
            area: edificio.area || undefined
          },
          edificio.id
        );
        importedCount++;
      } catch (error) {
        console.error(`[API:edificios/import-all] Error importando edificio: ${edificio.name}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} edificios importados correctamente`,
      data: {
        importedCount
      }
    });
  } catch (error) {
    console.error('[API:edificios/import-all] Error importing all edificios:', error);
    return NextResponse.json(
      { error: 'Failed to import edificios' },
      { status: 500 }
    );
  }
}

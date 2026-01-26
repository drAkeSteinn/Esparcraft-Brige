import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager } from '@/lib/fileManager';
import { UpdateGrimorioCardRequest, GrimorioCardCategory, GrimorioCardType } from '@/lib/types';
import { validateTemplateStructure, isValidPrimaryVariableKey, isValidTemplateKey } from '@/lib/grimorioUtils';
import { templateCache } from '@/lib/templateCache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const card = grimorioManager.getById(id);
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Error obteniendo card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener la card del grimorio' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body: UpdateGrimorioCardRequest = await request.json();

    // Obtener existingCard primero
    const existingCard = grimorioManager.getById(id);
    if (!existingCard) {
      return NextResponse.json({ success: false, error: 'Card no encontrada' }, { status: 404 });
    }

    console.log('[Grimorio API] PUT request:', { id, body, existingCard, tipo: body.tipo || existingCard.tipo });

    // Determinar tipo
    const tipo = body.tipo || existingCard.tipo;

    // Validar campos requeridos según tipo
    if (tipo === 'variable') {
      // Variables primarias: solo nombre es obligatorio
      if (!body.nombre) {
        return NextResponse.json({ success: false, error: 'Falta el nombre de la variable' }, { status: 400 });
      }
    } else if (tipo === 'plantilla') {
      // Plantillas: nombre, plantilla y categoria son obligatorios
      if (!body.nombre || !body.plantilla || !body.categoria) {
        return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
      }
    } else {
      // Tipo no especificado: validación estándar
      if (!body.nombre || !body.plantilla || !body.categoria) {
        return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
      }
    }

    // Categorías válidas
    const categoriasValidas: GrimorioCardCategory[] = ['general', 'variables', 'jugador', 'npc', 'ubicacion', 'mundo'];
    if (!categoriasValidas.includes(body.categoria)) {
      return NextResponse.json({ success: false, error: 'Categoria invalida' }, { status: 400 });
    }

    // Tipos válidos (si se proporciona)
    if (body.tipo) {
      const tiposValidos: GrimorioCardType[] = ['variable', 'plantilla'];
      if (!tiposValidos.includes(body.tipo)) {
        return NextResponse.json({ success: false, error: 'Tipo invalido' }, { status: 400 });
      }
    }

    // Validar unicidad de key si se cambia
    if (body.key && body.key !== existingCard.key) {
      if (!grimorioManager.isKeyUnique(body.key, id)) {
        return NextResponse.json({ success: false, error: 'La key ya existe' }, { status: 400 });
      }

      // Validar formato de key según tipo
      if (tipo === 'variable' && !isValidPrimaryVariableKey(body.key)) {
        return NextResponse.json({
          success: false,
          error: 'Formato de key inválido para variable primaria. Debe seguir el formato: jugador.*, npc.*, etc.'
        }, { status: 400 });
      }

      if (tipo === 'plantilla' && !isValidTemplateKey(body.key)) {
        return NextResponse.json({
          success: false,
          error: 'Formato de key inválido. Solo letras, números, guiones y guiones bajos'
        }, { status: 400 });
      }
    }

    // Validar estructura de plantilla si es tipo 'plantilla'
    if (tipo === 'plantilla') {
      const validations = validateTemplateStructure(body.plantilla, 'plantilla');
      if (validations.nestedTemplates.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Las plantillas no pueden contener otras plantillas',
          validations: {
            nestedTemplates: validations.nestedTemplates,
            missingVariables: validations.missingVariables,
            warnings: validations.warnings
          }
        }, { status: 400 });
      }
    }

    // Construir objeto de actualización
    const updates: any = {
      nombre: body.nombre.trim(),
      plantilla: body.plantilla ? body.plantilla.trim() : '',
      categoria: body.categoria.trim(),
      descripcion: body.descripcion?.trim()
    };

    // Incluir key solo si se proporciona
    if (body.key) {
      updates.key = body.key.trim().toLowerCase().replace(/\s+/g, '_');
    }

    // Incluir tipo solo si se proporciona
    if (body.tipo) {
      updates.tipo = body.tipo;
    }

    const updatedCard = grimorioManager.update(id, updates);

    if (!updatedCard) {
      return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
    }

    // Invalidar el cache de esta plantilla
    const invalidatedCount = templateCache.invalidateTemplate(id);
    if (invalidatedCount > 0) {
      console.log(`[Grimorio] Cache invalidado para plantilla ${id}: ${invalidatedCount} entrada(s) eliminada(s)`);
    }

    console.log(`Card de grimorio actualizada: ${id} - ${updatedCard.nombre} (tipo: ${updatedCard.tipo})`);
    return NextResponse.json({
      success: true,
      data: updatedCard,
      message: 'Card actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar la card del grimorio' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = grimorioManager.delete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
    }

    // Invalidar el cache de esta plantilla
    const invalidatedCount = templateCache.invalidateTemplate(id);
    if (invalidatedCount > 0) {
      console.log(`[Grimorio] Cache invalidado para plantilla ${id}: ${invalidatedCount} entrada(s) eliminada(s)`);
    }

    console.log(`Card de grimorio eliminada: ${id}`);
    return NextResponse.json({ success: true, message: 'Card eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar la card del grimorio' }, { status: 500 });
  }
}

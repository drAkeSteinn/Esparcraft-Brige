import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager } from '@/lib/fileManager';
import { UpdateGrimorioCardRequest } from '@/lib/types';

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
    if (!body.nombre || !body.plantilla || !body.categoria) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const existingCard = grimorioManager.getById(id);
    if (!existingCard) {
      return NextResponse.json({ success: false, error: 'Card no encontrada' }, { status: 404 });
    }

    if (body.key && body.key !== existingCard.key) {
      if (!grimorioManager.isKeyUnique(body.key, id)) {
        return NextResponse.json({ success: false, error: 'La key ya existe' }, { status: 400 });
      }
    }

    const updatedCard = grimorioManager.update(id, {
      ...(body.key && { key: body.key.trim().toLowerCase().replace(/\s+/g, '_') }),
      nombre: body.nombre.trim(),
      plantilla: body.plantilla.trim(),
      categoria: body.categoria.trim(),
      descripcion: body.descripcion?.trim()
    });

    if (!updatedCard) {
      return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
    }

    console.log(\`Card de grimorio actualizada: \${id} - \${updatedCard.nombre}\`);
    return NextResponse.json({ success: true, data: updatedCard, message: 'Card actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
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
    console.log(\`Card de grimorio eliminada: \${id}\`);
    return NextResponse.json({ success: true, message: 'Card eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
  }
}

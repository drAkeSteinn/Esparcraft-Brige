import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager } from '@/lib/fileManager';
import { CreateGrimorioCardRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const search = searchParams.get('search');

    let cards = categoria ? grimorioManager.getByCategory(categoria) : grimorioManager.getAll();

    if (search) {
      const searchLower = search.toLowerCase();
      cards = cards.filter(card =>
        card.nombre.toLowerCase().includes(searchLower) ||
        card.key.toLowerCase().includes(searchLower) ||
        card.plantilla.toLowerCase().includes(searchLower) ||
        (card.descripcion && card.descripcion.toLowerCase().includes(searchLower))
      );
    }

    const ordenCategorias = ['general', 'jugador', 'npc', 'ubicacion', 'mundo'];
    cards.sort((a, b) => {
      const indexA = ordenCategorias.indexOf(a.categoria);
      const indexB = ordenCategorias.indexOf(b.categoria);
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json({ success: true, data: { cards, total: cards.length } });
  } catch (error) {
    console.error('Error listando cards del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener las cards del grimorio' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGrimorioCardRequest = await request.json();
    if (!body.key || !body.nombre || !body.plantilla || !body.categoria) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const categoriasValidas = ['general', 'jugador', 'npc', 'ubicacion', 'mundo'];
    if (!categoriasValidas.includes(body.categoria)) {
      return NextResponse.json({ success: false, error: 'Categoria invalida' }, { status: 400 });
    }

    if (!grimorioManager.isKeyUnique(body.key)) {
      return NextResponse.json({ success: false, error: 'La key ya existe' }, { status: 400 });
    }

    const keyClean = body.key.trim().toLowerCase().replace(/\s+/g, '_');
    const newCard = grimorioManager.create({ key: keyClean, nombre: body.nombre.trim(), plantilla: body.plantilla.trim(), categoria: body.categoria.trim(), descripcion: body.descripcion?.trim() });

    console.log(`Nueva card de grimorio creada: ${newCard.id} - ${newCard.nombre}`);
    return NextResponse.json({ success: true, data: newCard, message: 'Card creada correctamente' });
  } catch (error) {
    console.error('Error creando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al crear la card del grimorio' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { grimorioManager } from '@/lib/fileManager';
import { CreateGrimorioCardRequest, GrimorioCardCategory, GrimorioCardType } from '@/lib/types';
import { validateTemplateStructure, isValidPrimaryVariableKey, isValidTemplateKey, determineTypeFromKey } from '@/lib/grimorioUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search');

    let cards = grimorioManager.getAll();

    // Filtrar por categoría si se especifica
    if (categoria) {
      cards = grimorioManager.getByCategory(categoria as GrimorioCardCategory);
    }

    // Filtrar por tipo si se especifica
    if (tipo) {
      cards = grimorioManager.getByType(tipo as GrimorioCardType);
    }

    // Filtrar por búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      cards = cards.filter(card =>
        card.nombre.toLowerCase().includes(searchLower) ||
        card.key.toLowerCase().includes(searchLower) ||
        card.plantilla.toLowerCase().includes(searchLower) ||
        (card.descripcion && card.descripcion.toLowerCase().includes(searchLower))
      );
    }

    const ordenCategorias = ['variables', 'general', 'jugador', 'npc', 'ubicacion', 'mundo'];
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
    
    // Validar campos requeridos
    // Para plantillas condicionales, plantilla puede estar vacío (se usa conditionalConfig)
    const isConditional = body.templateType === 'condicional';
    if (!body.key || !body.nombre || !body.categoria || !body.tipo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan campos requeridos: key, nombre, categoria, tipo' 
      }, { status: 400 });
    }
    if (!isConditional && !body.plantilla) {
      return NextResponse.json({ 
        success: false, 
        error: 'Falta el campo requerido: plantilla' 
      }, { status: 400 });
    }

    // Categorías válidas
    const categoriasValidas: GrimorioCardCategory[] = ['general', 'variables', 'jugador', 'npc', 'ubicacion', 'mundo'];
    if (!categoriasValidas.includes(body.categoria)) {
      return NextResponse.json({ success: false, error: 'Categoria invalida' }, { status: 400 });
    }

    // Tipos válidos
    const tiposValidos: GrimorioCardType[] = ['variable', 'plantilla'];
    if (!tiposValidos.includes(body.tipo)) {
      return NextResponse.json({ success: false, error: 'Tipo invalido' }, { status: 400 });
    }

    // Validar unicidad de la key
    if (!grimorioManager.isKeyUnique(body.key)) {
      return NextResponse.json({ success: false, error: 'La key ya existe' }, { status: 400 });
    }

    // Validar formato de key según tipo
    if (body.tipo === 'variable' && !isValidPrimaryVariableKey(body.key)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de key inválido para variable primaria. Debe seguir el formato: jugador.*, npc.*, etc.' 
      }, { status: 400 });
    }

    if (body.tipo === 'plantilla' && !isValidTemplateKey(body.key)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de key inválido. Solo letras, números, guiones y guiones bajos' 
      }, { status: 400 });
    }

    // Validar estructura de plantilla si es tipo 'plantilla' (no aplica a condicionales)
    const validations = validateTemplateStructure(body.plantilla || '', body.tipo);
    // ✅ Las plantillas anidadas SÍ están permitidas. Solo bloqueamos si hay
    // errores estructurales reales (ninguno actualmente, pero dejamos el hook).
    if (!validations.valid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Estructura de plantilla inválida',
        validations: {
          nestedTemplates: validations.nestedTemplates,
          missingVariables: validations.missingVariables,
          warnings: validations.warnings
        }
      }, { status: 400 });
    }

    // ✅ Plantilla condicional: validar templateType y conditionalConfig
    const templateType = body.templateType === 'condicional' ? 'condicional' : 'normal';
    let conditionalConfig = null;
    if (templateType === 'condicional') {
      if (!body.conditionalConfig || !body.conditionalConfig.npcId) {
        return NextResponse.json({
          success: false,
          error: 'Las plantillas condicionales requieren conditionalConfig.npcId'
        }, { status: 400 });
      }
      // Validar estructura mínima de branches
      if (!Array.isArray(body.conditionalConfig.branches)) {
        return NextResponse.json({
          success: false,
          error: 'conditionalConfig.branches debe ser un array'
        }, { status: 400 });
      }
      conditionalConfig = {
        npcId: body.conditionalConfig.npcId,
        branches: body.conditionalConfig.branches,
        defaultTemplate: body.conditionalConfig.defaultTemplate || ''
      };
    }

    const keyClean = body.key.trim().toLowerCase().replace(/\s+/g, '_');
    const newCard = grimorioManager.create({ 
      key: keyClean, 
      nombre: body.nombre.trim(), 
      plantilla: templateType === 'condicional' ? '' : body.plantilla.trim(), 
      categoria: body.categoria,
      tipo: body.tipo,
      templateType,
      conditionalConfig,
      descripcion: body.descripcion?.trim() 
    });

    console.log(`Nueva card de grimorio creada: ${newCard.id} - ${newCard.nombre} (tipo: ${newCard.tipo}/${templateType})`);
    return NextResponse.json({ 
      success: true, 
      data: newCard, 
      message: 'Card creada correctamente',
      validations: {
        variablesUsed: validations.variablesUsed,
        nestedTemplates: validations.nestedTemplates,
        warnings: validations.warnings
      }
    });
  } catch (error) {
    console.error('Error creando card del grimorio:', error);
    return NextResponse.json({ success: false, error: 'Error al crear la card del grimorio' }, { status: 500 });
  }
}

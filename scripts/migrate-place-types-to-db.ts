import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';

interface PlaceTypeJSON {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');
const PLACE_TYPES_DIR = path.join(DATA_DIR, 'place-types');

async function migratePlaceTypes() {
  console.log('🚀 Iniciando migración de PlaceTypes a la base de datos...\n');

  try {
    // 1. Leer todos los archivos JSON de place-types
    if (!fs.existsSync(PLACE_TYPES_DIR)) {
      console.error('❌ Error: El directorio place-types no existe');
      process.exit(1);
    }

    const files = fs.readdirSync(PLACE_TYPES_DIR)
      .filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.log('⚠️  No se encontraron archivos de place-types para migrar');
      return;
    }

    console.log(`📁 Encontrados ${files.length} archivos de place-types\n`);

    // 2. Leer y parsear todos los place-types
    const placeTypes: PlaceTypeJSON[] = [];
    for (const file of files) {
      try {
        const filePath = path.join(PLACE_TYPES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const placeType = JSON.parse(content) as PlaceTypeJSON;

        placeTypes.push(placeType);
        console.log(`✅ Leído: ${file} - ${placeType.name}`);
      } catch (error) {
        console.error(`❌ Error leyendo ${file}:`, error);
      }
    }

    console.log(`\n📊 Total de place-types leídos: ${placeTypes.length}\n`);

    // 3. Verificar si ya existen place-types en la DB
    const existingCount = await db.placeType.count();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} place-types en la base de datos`);
      console.log('ℹ️  Se eliminarán antes de la migración\n');

      await db.placeType.deleteMany({});
      console.log('✅ Place-types existentes eliminados\n');
    }

    // 4. Insertar los place-types en la DB
    console.log('💾 Insertando place-types en la base de datos...\n');

    let insertedCount = 0;
    for (const placeType of placeTypes) {
      try {
        await db.placeType.create({
          data: {
            id: placeType.id,
            name: placeType.name,
            icon: placeType.icon,
            color: placeType.color || null,
          }
        });
        insertedCount++;
        console.log(`✅ Insertado: ${placeType.name} (${placeType.id})`);
      } catch (error) {
        console.error(`❌ Error insertando ${placeType.name}:`, error);
      }
    }

    console.log(`\n🎉 Migración completada!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Archivos leídos: ${placeTypes.length}`);
    console.log(`   - Place-types insertados: ${insertedCount}`);
    console.log(`   - Errores: ${placeTypes.length - insertedCount}`);

    // 5. Verificar la migración
    const finalCount = await db.placeType.count();
    console.log(`\n🔍 Verificación: ${finalCount} place-types en la base de datos`);

    if (finalCount === insertedCount) {
      console.log('✅ Migración exitosa y verificada!\n');
      console.log('💡 Sugerencia: Los archivos JSON en data-esparcraft/place-types/ ya no son necesarios');
      console.log('   Puedes hacer backup de ese directorio antes de eliminarlo.\n');
    } else {
      console.log('⚠️  Advertencia: La cantidad de place-types en la DB no coincide con los insertados\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar migración
migratePlaceTypes();

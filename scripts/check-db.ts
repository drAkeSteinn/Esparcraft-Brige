import { db } from '../src/lib/db';

async function checkDatabase() {
  try {
    console.log('=== Verificando estado de la base de datos ===\n');

    // Contar registros en cada tabla
    const worlds = await db.world.count();
    const pueblos = await db.pueblo.count();
    const edificios = await db.edificio.count();
    const npcs = await db.nPC.count();
    const sessions = await db.session.count();

    console.log('📊 Conteo de registros:');
    console.log(`  - Mundos: ${worlds}`);
    console.log(`  - Pueblos: ${pueblos}`);
    console.log(`  - Edificios: ${edificios}`);
    console.log(`  - NPCs: ${npcs}`);
    console.log(`  - Sesiones: ${sessions}`);

    // Mostrar ejemplos si existen
    if (worlds > 0) {
      console.log('\n🌍 Mundos en la base de datos:');
      const worldList = await db.world.findMany({ take: 5 });
      worldList.forEach(w => {
        console.log(`  - ${w.name} (ID: ${w.id})`);
      });
    }

    if (npcs > 0) {
      console.log('\n👥 NPCs en la base de datos:');
      const npcList = await db.nPC.findMany({ take: 5 });
      npcList.forEach(n => {
        const card = JSON.parse(n.card);
        console.log(`  - ${card.name || 'Sin nombre'} (ID: ${n.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();

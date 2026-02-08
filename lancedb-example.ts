/**
 * Ejemplo de uso de LanceDB para Embeddings
 *
 * Este script muestra cómo usar el nuevo sistema de embeddings
 * con LanceDB directamente en Node.js.
 */

// Importar las funciones de LanceDB
import {
  LanceEmbeddingsDB,
  createEmbedding,
  searchSimilar,
  createBatchEmbeddings,
  getStats,
} from './src/lib/embeddings/lance-embeddings';

async function main() {
  console.log('🚀 Ejemplo de LanceDB Embeddings\n');

  try {
    // 1. Verificar conexión
    console.log('1️⃣  Verificando conexión con LanceDB...');
    const isConnected = await LanceEmbeddingsDB.checkConnection();
    console.log(`   ✅ Conectado: ${isConnected}\n`);

    // 2. Crear un embedding
    console.log('2️⃣  Creando un embedding...');
    const embeddingId1 = await createEmbedding({
      content: "Hola, soy un NPC en el pueblo",
      source_type: "npc",
      source_id: "npc-1",
      namespace: "pueblo",
      metadata: {
        name: "Juan",
        location: "plaza",
        mood: "friendly"
      }
    });
    console.log(`   ✅ Embedding creado: ${embeddingId1}\n`);

    // 3. Crear más embeddings
    console.log('3️⃣  Creando más embeddings...');
    const embeddingId2 = await createEmbedding({
      content: "Vendo espadas y escudos de hierro",
      source_type: "npc",
      source_id: "npc-2",
      namespace: "pueblo",
      metadata: {
        name: "Pedro",
        location: "tienda",
        mood: "business"
      }
    });

    const embeddingId3 = await createEmbedding({
      content: "La tienda abre a las 9 de la mañana",
      source_type: "building",
      source_id: "building-1",
      namespace: "pueblo",
      metadata: {
        name: "Tienda de armas",
        location: "plaza",
        hours: "9:00-18:00"
      }
    });
    console.log(`   ✅ Embeddings creados: ${embeddingId2}, ${embeddingId3}\n`);

    // 4. Crear embeddings en batch
    console.log('4️⃣  Creando embeddings en batch...');
    const batchIds = await createBatchEmbeddings([
      {
        content: "El clima es soleado hoy",
        source_type: "weather",
        source_id: "weather-1",
        namespace: "environment",
        metadata: { temperature: "25°C" }
      },
      {
        content: "Hace un día brillante",
        source_type: "weather",
        source_id: "weather-2",
        namespace: "environment",
        metadata: { temperature: "28°C" }
      },
      {
        content: "El cielo está despejado",
        source_type: "weather",
        source_id: "weather-3",
        namespace: "environment",
        metadata: { temperature: "22°C" }
      }
    ]);
    console.log(`   ✅ Batch creado: ${batchIds.length} embeddings\n`);

    // 5. Buscar embeddings similares
    console.log('5️⃣  Buscando embeddings similares...');
    const searchResults1 = await searchSimilar({
      query: "¿Qué se vende aquí?",
      namespace: "pueblo",
      limit: 3,
      threshold: 0.5
    });

    console.log('   Resultados para "¿Qué se vende aquí?":');
    searchResults1.forEach((result, index) => {
      console.log(`   ${index + 1}. [Score: ${result.score.toFixed(3)}] ${result.content}`);
      console.log(`      Fuente: ${result.source_type}:${result.source_id}`);
      console.log(`      Metadata: ${JSON.stringify(result.metadata)}`);
      console.log('');
    });

    const searchResults2 = await searchSimilar({
      query: "día",
      namespace: "environment",
      limit: 5
    });

    console.log('   Resultados para "día":');
    searchResults2.forEach((result, index) => {
      console.log(`   ${index + 1}. [Score: ${result.score.toFixed(3)}] ${result.content}`);
      console.log(`      Fuente: ${result.source_type}:${result.source_id}`);
      console.log('');
    });

    // 6. Buscar con filtros
    console.log('6️⃣  Buscando con filtros...');
    const filteredResults = await searchSimilar({
      query: "tienda",
      namespace: "pueblo",
      limit: 10,
      source_type: "building", // Solo de tipo "building"
      threshold: 0.3
    });

    console.log(`   Resultados filtrados (solo buildings): ${filteredResults.length}`);
    filteredResults.forEach((result, index) => {
      console.log(`   ${index + 1}. [Score: ${result.score.toFixed(3)}] ${result.content}`);
    });

    // 7. Obtener estadísticas
    console.log('\n7️⃣  Estadísticas del sistema...');
    const stats = await getStats();
    console.log(`   Total embeddings: ${stats.total_embeddings}`);
    console.log(`   Total namespaces: ${stats.total_namespaces}`);
    console.log(`   Fuentes únicas: ${stats.unique_sources}`);
    if (stats.storage_size_mb) {
      console.log(`   Tamaño en disco: ${stats.storage_size_mb.toFixed(2)} MB`);
    }

    console.log('\n✅ Ejemplo completado exitosamente!');
    console.log('\n💡 Tipos de búsqueda que puedes probar:');
    console.log('   - "¿Qué hora abre la tienda?" (busca horarios)');
    console.log('   - "¿Dónde está el armero?" (busca NPCs)');
    console.log('   - "clima" (busca información del clima)');
    console.log('   - "pueblo" (busca todo lo relacionado)');
    console.log('   - "amigable" (busca NPCs con mood: friendly)');

  } catch (error) {
    console.error('\n❌ Error en el ejemplo:', error);
    process.exit(1);
  }
}

// Ejecutar ejemplo
if (import.meta.url) {
  // Ejecutado como módulo ES
  main();
} else {
  // Ejecutado con Node.js
  main();
}

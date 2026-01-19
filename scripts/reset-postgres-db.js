/**
 * Script para resetear la base de datos de Embeddings
 * ⚠️  CUIDADO: Esto borrará todos los embeddings!
 *
 * Uso:
 *   node scripts/reset-postgres-db.js [--force]
 *
 * Variables de entorno requeridas en .env:
 *   EMBEDDINGS_DB_HOST=localhost
 *   EMBEDDINGS_DB_PORT=5432
 *   EMBEDDINGS_DB_NAME=bridge_embeddings
 *   EMBEDDINGS_DB_USER=postgres
 *   EMBEDDINGS_DB_PASSWORD=postgres
 */

import pg from 'pg';

// Configuración de conexión
const config = {
  host: process.env.EMBEDDINGS_DB_HOST || 'localhost',
  port: parseInt(process.env.EMBEDDINGS_DB_PORT) || 5432,
  database: process.env.EMBEDDINGS_DB_NAME || 'bridge_embeddings',
  user: process.env.EMBEDDINGS_DB_USER || 'postgres',
  password: process.env.EMBEDDINGS_DB_PASSWORD || 'postgres'
};

/**
 * Elimina la base de datos
 */
async function dropDatabase(client) {
  try {
    // Primero, desconectar todas las conexiones activas
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${config.database}'
        AND pid <> pg_backend_pid()
    `);

    // Eliminar la base de datos
    await client.query(`DROP DATABASE ${config.database}`);
    console.log(`✅ Base de datos '${config.database}' eliminada exitosamente`);
  } catch (error) {
    if (error.code === '3D000') {
      console.log(`ℹ️  La base de datos '${config.database}' no existe`);
    } else {
      throw error;
    }
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const forceFlag = args.includes('--force') || args.includes('-f');

  console.log('⚠️  Reset de base de datos de Embeddings\n');

  if (!forceFlag) {
    console.log('⚠️  ADVERTENCIA: Esto borrará TODOS los embeddings!');
    console.log('📊 Estadísticas actuales:');

    const client = new pg.Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password
    });

    try {
      await client.connect();

      // Contar embeddings
      const countResult = await client.query('SELECT COUNT(*) as count FROM embeddings');
      const count = parseInt(countResult.rows[0].count);
      console.log(`   - Embeddings: ${count}`);

      // Contar namespaces
      const nsResult = await client.query('SELECT COUNT(*) as count FROM record_namespaces');
      const nsCount = parseInt(nsResult.rows[0].count);
      console.log(`   - Namespaces: ${nsCount}`);

      await client.end();
    } catch (error) {
      console.log('   (No se pudo obtener estadísticas)');
    }

    console.log('\n💡 Para continuar, usa: node scripts/reset-postgres-db.js --force');
    process.exit(0);
  }

  console.log('🚀 Eliminando base de datos...\n');

  // Conectar a postgres para eliminar la base de datos
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    database: 'postgres',
    user: config.user,
    password: config.password
  });

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    console.log(`\n📦 Base de datos a eliminar: ${config.database}\n`);

    // Eliminar base de datos
    await dropDatabase(client);

    console.log('\n✨ Reset completado exitosamente!\n');
    console.log('💡 Para recrear la base de datos, ejecuta:');
    console.log('   node scripts/init-postgres-db.js');

  } catch (error) {
    console.error('\n❌ Error durante el reset:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Asegúrate de que PostgreSQL esté corriendo y accesible en:');
      console.error(`   ${config.host}:${config.port}`);
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejutar
main();

/**
 * Script de inicialización de PostgreSQL para Embeddings
 *
 * Uso:
 *   node scripts/init-postgres-db.js
 *
 * Variables de entorno requeridas en .env:
 *   EMBEDDINGS_DB_HOST=localhost
 *   EMBEDDINGS_DB_PORT=5432
 *   EMBEDDINGS_DB_NAME=bridge_embeddings
 *   EMBEDDINGS_DB_USER=postgres
 *   EMBEDDINGS_DB_PASSWORD=postgres
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de conexión
const config = {
  host: process.env.EMBEDDINGS_DB_HOST || 'localhost',
  port: parseInt(process.env.EMBEDDINGS_DB_PORT) || 5432,
  database: process.env.EMBEDDINGS_DB_NAME || 'bridge_embeddings',
  user: process.env.EMBEDDINGS_DB_USER || 'postgres',
  password: process.env.EMBEDDINGS_DB_PASSWORD || 'postgres'
};

/**
 * Crea la base de datos si no existe
 */
async function createDatabase(client) {
  try {
    await client.query(`CREATE DATABASE ${config.database}`);
    console.log(`✅ Base de datos '${config.database}' creada exitosamente`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ️  La base de datos '${config.database}' ya existe`);
    } else {
      throw error;
    }
  }
}

/**
 * Crea las tablas y funciones necesarias
 */
async function createTables() {
  const schemaPath = path.join(__dirname, '../db/embeddings-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('📋 Leyendo schema desde:', schemaPath);
  console.log('⏳ Creando tablas y funciones...');

  // Dividir el schema en sentencias individuales
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const client = new pg.Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    let successCount = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        successCount++;
      } catch (error) {
        // Ignorar errores de "ya existe"
        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn('⚠️  Advertencia:', error.message.substring(0, 100));
        }
      }
    }

    console.log(`✅ ${successCount}/${statements.length} sentencias ejecutadas exitosamente`);

    // Verificar que la extensión pgvector está instalada
    const result = await client.query(`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Extensión pgvector instalada correctamente');
    } else {
      throw new Error('❌ Extensión pgvector NO instalada. Por favor instálala:');
    }

    // Mostrar tablas creadas
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Tablas creadas:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Mostrar funciones creadas
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);

    console.log('\n⚡ Funciones creadas:');
    functions.rows.forEach(row => {
      console.log(`   - ${row.routine_name}()`);
    });

  } catch (error) {
    console.error('❌ Error al crear tablas:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Inicializando base de datos de Embeddings...\n');

  // Conectar a postgres para crear la base de datos
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

    console.log(`\n📦 Configuración:`);
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);

    // Crear base de datos
    await createDatabase(client);

    await client.end();

    // Crear tablas
    await createTables();

    console.log('\n✨ Inicialización completada exitosamente!\n');
    console.log('💡 Siguientes pasos:');
    console.log('   1. Configurar Text Generation WebUI');
    console.log('   2. Crear el cliente de embeddings');
    console.log('   3. Crear las API routes');

  } catch (error) {
    console.error('\n❌ Error durante la inicialización:');
    console.error(error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Asegúrate de que PostgreSQL esté corriendo y accesible en:');
      console.error(`   ${config.host}:${config.port}`);
    }

    if (error.message.includes('password authentication')) {
      console.error('\n💡 Verifica las credenciales en tu archivo .env');
    }

    process.exit(1);
  }
}

// Ejutar
main();

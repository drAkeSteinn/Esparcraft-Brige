/**
 * SCRIPT DE MIGRACIÓN - GRIMORIO
 * 
 * Migra las cards existentes del Grimorio al nuevo esquema con el campo 'tipo'
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data-esparcraft');
const GRIMORIO_DIR = path.join(DATA_DIR, 'grimorio');
const BACKUP_DIR = path.join(DATA_DIR, 'grimorio-backup');

// Patrones para identificar variables primarias
const PRIMARY_VARIABLE_PATTERNS = [
  /^jugador\./,
  /^npc\./,
  /^mundo\./,
  /^pueblo\./,
  /^edificio\./,
  /^session\./,
  /^(nombre|raza|nivel|salud|reputacion|almakos|deuda|piedras|hora|clima)$/,
  /^(playername|npcid|npc_name|npc_description|player_race|player_raza|player_level|player_nivel|player_health|player_salud|player_reputation|player_reputacion|player_time|player_hora|player_weather|player_clima)$/,
  /^(userMessage|user_message|lastSummary|ultimo_resumen|chatHistory|chat_history|char|CHAR|templateUser|template_user)$/,
  /^(mensaje)$/
];

/**
 * Determina el tipo de una variable basado en su key
 */
function determineTypeFromKey(key) {
  const normalizedKey = key.trim().toLowerCase();

  for (const pattern of PRIMARY_VARIABLE_PATTERNS) {
    if (pattern.test(normalizedKey)) {
      return 'variable';
    }
  }

  return 'plantilla';
}

/**
 * Mapea categorías antiguas a nuevas
 */
function mapCategoria(categoria) {
  // Si ya es una de las nuevas categorías, retornarla
  const nuevasCategorias = ['general', 'variables', 'jugador', 'npc', 'ubicacion', 'mundo'];
  if (nuevasCategorias.includes(categoria)) {
    return categoria;
  }

  // Para las categorías antiguas, mantenerlas como están (general, jugador, npc, ubicacion, mundo)
  // Las variables primarias se mapearán a 'variables' después
  return categoria;
}

/**
 * Ejecuta la migración
 */
function migrate() {
  console.log('=== Iniciando migración del Grimorio ===\n');

  // Paso 1: Crear backup
  console.log('Paso 1: Creando backup...');
  if (fs.existsSync(BACKUP_DIR)) {
    console.log('El directorio de backup ya existe. Por seguridad, no se sobrescribirá.');
    console.log('Si deseas volver a migrar, elimina el directorio:', BACKUP_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(GRIMORIO_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No hay archivos para migrar.');
    process.exit(0);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let migratedCount = 0;
  let variableCount = 0;
  let plantillaCount = 0;

  // Paso 2: Migrar cada archivo
  console.log(`\nPaso 2: Migrando ${files.length} archivos...`);

  for (const file of files) {
    const filePath = path.join(GRIMORIO_DIR, file);
    const backupFilePath = path.join(BACKUP_DIR, file);

    try {
      // Leer archivo original
      const content = fs.readFileSync(filePath, 'utf-8');
      const card = JSON.parse(content);

      // Guardar backup
      fs.writeFileSync(backupFilePath, content);

      // Determinar tipo basado en la key
      const tipo = determineTypeFromKey(card.key);

      // Determinar categoría
      let categoria = mapCategoria(card.categoria);

      // Para variables primarias, mapear a categoría 'variables'
      if (tipo === 'variable') {
        categoria = 'variables';
        variableCount++;
      } else {
        plantillaCount++;
      }

      // Agregar nuevo campo tipo
      const migratedCard = {
        ...card,
        tipo,
        categoria
      };

      // Escribir archivo migrado
      fs.writeFileSync(filePath, JSON.stringify(migratedCard, null, 2), 'utf-8');
      migratedCount++;

      console.log(`  ✓ ${file}: ${card.key} → tipo: ${tipo}, categoría: ${categoria}`);

    } catch (error) {
      console.error(`  ✗ Error migrando ${file}:`, error);
    }
  }

  // Paso 3: Reporte
  console.log('\n=== Reporte de Migración ===');
  console.log(`Archivos migrados: ${migratedCount}/${files.length}`);
  console.log(`Variables primarias: ${variableCount}`);
  console.log(`Plantillas: ${plantillaCount}`);
  console.log(`Backup creado en: ${BACKUP_DIR}`);
  console.log('\n✓ Migración completada exitosamente!');
}

// Ejecutar migración
migrate();

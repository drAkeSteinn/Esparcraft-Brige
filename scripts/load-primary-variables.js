#!/usr/bin/env node

/**
 * Script para cargar variables primarias del glosario en el Grimorio
 *
 * Este script lee las variables definidas en src/lib/VARIABLE_GLOSSARY.ts
 * y las crea como cards tipo 'variable' en el Grimorio.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de categorías del glosario a categorías del Grimorio
const CATEGORY_MAPPING = {
  'player': 'variables',
  'npc': 'variables',
  'session': 'variables',
  'world': 'variables',
  'pueblo': 'variables',
  'edificio': 'variables',
  'template': 'variables',
  'meta': 'variables',
  'custom': 'variables'
};

// Variables primarias del glosario (seleccionadas por el usuario)
const PRIMARY_VARIABLES = [
  // Variables del Jugador
  { key: 'jugador.nombre', nombre: 'Nombre del Jugador', categoria: 'variables', descripcion: 'Nombre completo del jugador' },
  { key: 'jugador.raza', nombre: 'Raza del Jugador', categoria: 'variables', descripcion: 'Raza del jugador' },
  { key: 'jugador.nivel', nombre: 'Nivel del Jugador', categoria: 'variables', descripcion: 'Nivel actual del jugador' },
  { key: 'jugador.salud_actual', nombre: 'Salud del Jugador', categoria: 'variables', descripcion: 'Estado de salud actual del jugador' },
  { key: 'jugador.reputacion', nombre: 'Reputación del Jugador', categoria: 'variables', descripcion: 'Puntuación de reputación del jugador' },
  { key: 'jugador.almakos', nombre: 'Almakos', categoria: 'variables', descripcion: 'Cantidad de monedas Almakos del jugador' },
  { key: 'jugador.deuda', nombre: 'Deuda', categoria: 'variables', descripcion: 'Deuda actual del jugador' },
  { key: 'jugador.piedras_del_alma', nombre: 'Piedras del Alma', categoria: 'variables', descripcion: 'Cantidad de piedras del alma del jugador' },
  { key: 'jugador.hora', nombre: 'Hora Actual', categoria: 'variables', descripcion: 'Hora actual del juego' },
  { key: 'jugador.clima', nombre: 'Clima Actual', categoria: 'variables', descripcion: 'Clima actual del entorno' },
  { key: 'jugador.mensaje', nombre: 'Mensaje del Jugador', categoria: 'variables', descripcion: 'Último mensaje enviado por el jugador' },

  // Variables del NPC
  { key: 'npc.name', nombre: 'Nombre del NPC', categoria: 'variables', descripcion: 'Nombre del NPC interactuando' },
  { key: 'npc.description', nombre: 'Descripción del NPC', categoria: 'variables', descripcion: 'Descripción física y característica del NPC' },
  { key: 'npc.personality', nombre: 'Personalidad del NPC', categoria: 'variables', descripcion: 'Rasgos de personalidad del NPC' },
  { key: 'npc.scenario', nombre: 'Escenario del NPC', categoria: 'variables', descripcion: 'Contexto o ubicación del NPC' },
  { key: 'npc.historial', nombre: 'Historial del NPC', categoria: 'variables', descripcion: 'Historial de interacciones con el NPC' },

  // Variables de Ubicación (simples)
  { key: 'mundo', nombre: 'Mundo', categoria: 'variables', descripcion: 'Nombre del mundo actual (alias de mundo.name)' },
  { key: 'pueblo', nombre: 'Pueblo', categoria: 'variables', descripcion: 'Nombre del pueblo actual (alias de pueblo.name)' },
  { key: 'edificio', nombre: 'Edificio', categoria: 'variables', descripcion: 'Nombre del edificio actual (alias de edificio.name)' },

  // Variables del Mundo
  { key: 'mundo.estado', nombre: 'Estado del Mundo', categoria: 'variables', descripcion: 'Estado general del mundo' },
  { key: 'mundo.rumores', nombre: 'Rumores del Mundo', categoria: 'variables', descripcion: 'Rumores actuales del mundo' },

  // Variables del Pueblo
  { key: 'pueblo.name', nombre: 'Nombre del Pueblo', categoria: 'variables', descripcion: 'Nombre completo del pueblo' },
  { key: 'pueblo.tipo', nombre: 'Tipo de Pueblo', categoria: 'variables', descripcion: 'Clasificación o tipo de pueblo' },
  { key: 'pueblo.descripcion', nombre: 'Descripción del Pueblo', categoria: 'variables', descripcion: 'Descripción general del pueblo' },
  { key: 'pueblo.estado', nombre: 'Estado del Pueblo', categoria: 'variables', descripcion: 'Estado actual del pueblo' },
  { key: 'pueblo.rumores', nombre: 'Rumores del Pueblo', categoria: 'variables', descripcion: 'Rumores y eventos del pueblo' },

  // Variables del Edificio
  { key: 'edificio.name', nombre: 'Nombre del Edificio', categoria: 'variables', descripcion: 'Nombre del edificio' },
  { key: 'edificio.descripcion', nombre: 'Descripción del Edificio', categoria: 'variables', descripcion: 'Lore o descripción del edificio' },
  { key: 'edificio.eventos', nombre: 'Eventos del Edificio', categoria: 'variables', descripcion: 'Eventos recientes en el edificio' },
  { key: 'edificio.poislist', nombre: 'POIs del Edificio', categoria: 'variables', descripcion: 'Lista de puntos de interés del edificio' },

  // Variables Abreviadas
  { key: 'nombre', nombre: 'Nombre (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para jugador.nombre' },
  { key: 'raza', nombre: 'Raza (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para jugador.raza' },
  { key: 'nivel', nombre: 'Nivel (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para jugador.nivel' },
  { key: 'salud', nombre: 'Salud (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para jugador.salud_actual' },
  { key: 'npc', nombre: 'NPC (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para npc.name' },
  { key: 'playername', nombre: 'PlayerName (Abreviado)', categoria: 'variables', descripcion: 'Alias corto para jugador.nombre (formato API)' }
];

// Ruta del Grimorio
const GRIMORIO_DIR = path.join(__dirname, '../data-esparcraft/grimorio');

/**
 * Crea una card del Grimorio
 */
function createGrimorioCard(variable) {
  const id = `VAR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    key: variable.key,
    nombre: variable.nombre,
    plantilla: '', // Variables primarias no tienen contenido de plantilla
    categoria: variable.categoria,
    tipo: 'variable', // Tipo variable = informativa
    descripcion: variable.descripcion,
    timestamp: new Date().toISOString()
  };
}

/**
 * Guarda una card en el Grimorio
 */
function saveCard(card) {
  const filename = `${card.id}.json`;
  const filepath = path.join(GRIMORIO_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(card, null, 2), 'utf-8');
  console.log(`✓ Creada: ${card.key} -> ${filepath}`);
}

/**
 * Verifica si una card ya existe
 */
function cardExists(key) {
  const files = fs.readdirSync(GRIMORIO_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filepath = path.join(GRIMORIO_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const card = JSON.parse(content);

    if (card.key === key) {
      return true;
    }
  }
  return false;
}

/**
 * Main function
 */
function main() {
  console.log('📚 Cargando variables primarias en el Grimorio...\n');

  // Verificar directorio
  if (!fs.existsSync(GRIMORIO_DIR)) {
    console.error(`❌ Error: El directorio ${GRIMORIO_DIR} no existe`);
    process.exit(1);
  }

  // Crear backup
  const backupDir = path.join(__dirname, '../data-esparcraft/grimorio-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-before-primary-vars-${backupTimestamp}.json`);

  const existingFiles = fs.readdirSync(GRIMORIO_DIR);
  const backupData = existingFiles
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(GRIMORIO_DIR, f), 'utf-8')));

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`📦 Backup creado en: ${backupFile}\n`);

  // Procesar variables
  let created = 0;
  let skipped = 0;

  for (const variable of PRIMARY_VARIABLES) {
    // Verificar si ya existe
    if (cardExists(variable.key)) {
      console.log(`⊘ Omitida (ya existe): ${variable.key}`);
      skipped++;
      continue;
    }

    // Crear card
    const card = createGrimorioCard(variable);
    saveCard(card);
    created++;
  }

  console.log(`\n✅ Carga completada:`);
  console.log(`   - Variables creadas: ${created}`);
  console.log(`   - Variables omitidas (ya existían): ${skipped}`);
  console.log(`   - Total procesadas: ${PRIMARY_VARIABLES.length}`);
}

main();

#!/usr/bin/env node

/**
 * Script de Inicializacion Automatica
 *
 * Este script verifica e instala todas las dependencias necesarias
 * para ejecutar el proyecto por primera vez.
 *
 * Compatible con Windows, Linux y macOS
 * Usa bun o npm segun disponibilidad
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Iniciando Esparcraft-Bridge...\n');

// Detectar sistema operativo
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

console.log(`Sistema detectado: ${isWindows ? 'Windows' : isLinux ? 'Linux' : isMac ? 'macOS' : process.platform}\n`);

// Detectar si bun esta disponible
function checkBunAvailable() {
  try {
    execSync('bun --version', { stdio: 'ignore', cwd: process.cwd() });
    return true;
  } catch (error) {
    console.log('Bun no encontrado. Se usara npm como fallback.\n');
    return false;
  }
}

const hasBun = checkBunAvailable();
const pkgManager = hasBun ? 'bun' : 'npm';

console.log(`Gestor de paquetes: ${pkgManager.toUpperCase()}\n`);

// Funcion para ejecutar comandos con el gestor adecuado
function runCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env }
    });
    console.log(`${description} completado con ${pkgManager}`);
    return true;
  } catch (error) {
    console.error(`Error en ${description}:`, error.message);
    return false;
  }
}

// Comando de instalacion segun gestor
function getInstallCommand() {
  if (hasBun) {
    return 'bun install';
  } else {
    return 'npm install';
  }
}

// Comando de agregar paquete segun gestor
function getAddCommand(packageName) {
  if (hasBun) {
    return `bun add ${packageName}`;
  } else {
    return `npm install ${packageName}`;
  }
}

// Verificar si node_modules existe
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const hasNodeModules = fs.existsSync(nodeModulesPath);

if (!hasNodeModules) {
  console.log('No se encontraron node_modules. Instalando dependencias...\n');

  const installCmd = getInstallCommand();
  const success = runCommand(installCmd, 'Instalando dependencias');

  if (!success) {
    console.log('\nFallo la instalacion. Intentando con gestor alternativo...\n');
    if (hasBun) {
      // Intentar con npm si bun fallo
      runCommand('npm install', 'Instalando dependencias con npm');
    } else {
      // Intentar con yarn si npm fallo
      runCommand('yarn install', 'Instalando dependencias con yarn');
    }
  }
} else {
  console.log('node_modules encontrado. Verificando dependencias...\n');

  // Verificar que lancedb este instalado
  const lancedbPath = path.join(nodeModulesPath, 'lancedb');
  if (!fs.existsSync(lancedbPath)) {
    console.log('lancedb no encontrado. Instalando...\n');
    runCommand(getAddCommand('lancedb'), 'Instalando lancedb');
  } else {
    console.log('Todas las dependencias parecen estar instaladas\n');
  }
}

// Crear directorios necesarios
const directories = [
  './data/embeddings',
  './logs',
  './temp'
];

console.log('Creando directorios necesarios...\n');
directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  } else {
    console.log(`Directorio existe: ${dir}`);
  }
});

// Verificar archivo .env.local (variables locales LLM, etc.)
const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envLocalPath)) {
  console.log('\nNo se encontro .env.local\n');

  if (fs.existsSync(envExamplePath)) {
    console.log('Se encontro .env.example. Copiando a .env.local...\n');
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('.env.local creado desde .env.example');
  } else {
    console.log('Creando .env.local con valores por defecto...\n');
    fs.writeFileSync(envLocalPath, '# Variables de entorno locales (LLM, etc.)\nLLM_API_URL=http://127.0.0.1:5000/v1/chat/completions\nLLM_MODEL=local-model\nLLM_TEMPERATURE=0.7\nLLM_MAX_TOKENS=2048');
    console.log('.env.local creado con valores por defecto');
  }
} else {
  console.log('.env.local encontrado\n');
}

// Verificar archivo .env (base de datos y configs generales)
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('\nNo se encontro .env\n');

  if (fs.existsSync(envExamplePath)) {
    console.log('Se encontro .env.example. Copiando a .env...\n');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('.env creado desde .env.example');
  } else {
    console.log('Creando .env con valores por defecto...\n');
    fs.writeFileSync(envPath, '# Variables de entorno de base de datos\nDATABASE_URL="file:./db/dev.db"\nLANCEDB_PATH=./data/embeddings\nEMBEDDING_PROVIDER=ollama\nOLLAMA_URL=http://localhost:11434\nOLLAMA_MODEL=nomic-embed-text\nEMBEDDING_DIMENSION=768');
    console.log('.env creado con valores por defecto');
  }
} else {
  console.log('.env encontrado\n');
}

// Verificar base de datos
const dbPath = path.join(process.cwd(), 'db', 'bridge.db');
const hasDb = fs.existsSync(dbPath);

if (!hasDb) {
  console.log('Base de datos no encontrada. Se creara automaticamente al iniciar el servidor.\n');
}

console.log('\nInicializacion completada!\n');
console.log('Siguientes pasos:\n');
console.log(`   1. Configurar .env si es necesario`);
console.log(`   2. Iniciar servidor con: ${pkgManager} run dev`);
console.log(`\nComandos disponibles (${pkgManager}):`);

if (hasBun) {
  console.log(`   ${pkgManager} run dev     - Desarrollo (con setup automatico)`);
  console.log(`   ${pkgManager} run dev:quick - Desarrollo rapido`);
  console.log(`   ${pkgManager} run build   - Construir para produccion`);
  console.log(`   ${pkgManager} run start   - Iniciar produccion`);
} else {
  console.log(`   ${pkgManager} run dev     - Desarrollo`);
  console.log(`   ${pkgManager} run build   - Construir para produccion`);
  console.log(`   ${pkgManager} run start   - Iniciar produccion`);
}

console.log('\nPara iniciar el servidor de desarrollo:');
console.log(`   ${pkgManager} run dev\n`);

if (isLinux || isMac) {
  console.log('\nNotas para Linux/macOS:');
  console.log('   Se usara npm como gestor de paquetes (Bun no disponible)');
  console.log('   npm es compatible con todos los sistemas operativos');
  console.log('   Los comandos de npm pueden ser un poco mas lentos que bun');
}

if (isWindows) {
  console.log('\nNotas para Windows:');
  console.log('   Se usara bun como gestor de paquetes (rapido)');
  console.log('   Para usar npm en lugar de bun:');
  console.log('   npm install && npm run dev');
}

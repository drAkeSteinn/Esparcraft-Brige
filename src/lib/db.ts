import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Verifica si un archivo SQLite contiene la tabla `World` (tabla principal del
 * schema de Esparcraft). Usamos una heurística barata: leer el archivo y buscar
 * el string `World` en la región del schema (SQLite guarda el schema como texto
 * en sqlite_master, así que esto es fiable para detectar si la BD tiene el
 * schema de Esparcraft y no es una BD vacía de otro proyecto).
 */
function hasEsparcraftSchema(absPath: string): boolean {
  try {
    if (!existsSync(absPath)) return false
    // Lee solo los primeros 64KB (el schema vive en las primeras páginas)
    const fd = readFileSync(absPath, { encoding: null, flag: 'r' })
    const head = fd.subarray(0, Math.min(fd.length, 65536)).toString('latin1')
    // Buscamos CREATE TABLE World (la tabla principal del schema)
    return /CREATE TABLE "World"/i.test(head)
  } catch {
    return false
  }
}

/**
 * Resuelve la URL de la base de datos SQLite a usar.
 *
 * Orden de prioridad:
 *  1. process.env.DATABASE_URL si apunta a un archivo con el schema de Esparcraft.
 *  2. Fallback a <project-root>/db/custom.db (BD empaquetada con datos migrados).
 *
 * Esto evita el bug por el cual Next.js, al detectar múltiples lockfiles en el
 * workspace, carga el .env del proyecto padre y resuelve DATABASE_URL a una
 * BD vacía de otro proyecto, provocando errores "table does not exist".
 */
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (envUrl) {
    const fsPath = envUrl.startsWith('file:') ? envUrl.slice('file:'.length) : envUrl
    const abs = resolve(fsPath)
    if (hasEsparcraftSchema(abs)) {
      return envUrl
    }
    console.warn(`[DB] DATABASE_URL no apunta a una BD con schema Esparcraft: ${abs}. Usando fallback.`)
  }
  // Fallback: BD empaquetada en <project-root>/db/custom.db
  const candidates = [
    resolve(process.cwd(), 'db/custom.db'),
    resolve(__dirname, '../../db/custom.db'),
  ]
  for (const c of candidates) {
    if (hasEsparcraftSchema(c)) {
      const url = `file:${c}`
      console.warn(`[DB] Usando BD fallback: ${url}`)
      return url
    }
  }
  // Último recurso: devolver el env original (que dejará que Prisma falle con
  // un mensaje claro) o el primer candidato si no hay env.
  return envUrl || `file:${candidates[0]}`
}

// Forzar creación de nueva instancia para debugging
const createPrismaClient = () => {
  const databaseUrl = resolveDatabaseUrl()
  console.log('[DB] Creating new PrismaClient instance...', { databaseUrl })
  const client = new PrismaClient({
    log: ['query'],
    datasources: { db: { url: databaseUrl } },
  })
  const models = Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$'))
  console.log('[DB] Available models:', models)
  return client
}

// Siempre crear nueva instancia en desarrollo para evitar cache
const shouldUseCache = process.env.NODE_ENV === 'production'

export const db = shouldUseCache && globalForPrisma.prisma
  ? globalForPrisma.prisma
  : createPrismaClient()

if (shouldUseCache) {
  globalForPrisma.prisma = db
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Forzar creación de nueva instancia para debugging
const createPrismaClient = () => {
  console.log('[DB] Creating new PrismaClient instance...')
  const client = new PrismaClient({
    log: ['query'],
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

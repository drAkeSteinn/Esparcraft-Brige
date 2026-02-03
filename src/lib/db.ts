import { PrismaClient } from '@prisma/client'

// Force reload by changing cache key
const globalForPrisma = globalThis as unknown as {
  prismaV2: PrismaClient | undefined
}

export const db =
  globalForPrisma.prismaV2 ||
  new PrismaClient({
    log: ['query'],
  })

globalForPrisma.prismaV2 = db
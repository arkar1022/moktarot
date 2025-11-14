import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const datasourceUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
if (!datasourceUrl) {
  throw new Error('DATABASE_URL is not set')
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl
      }
    }
  })
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

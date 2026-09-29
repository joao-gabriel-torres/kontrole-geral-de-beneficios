import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

export * from './generated/prisma/client'

export function criarPrisma(url = process.env.DATABASE_URL): PrismaClient {
  if (!url) throw new Error('DATABASE_URL não definida (veja .env.example)')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
}

export function codigoAcionamento(numero: number): string {
  return `AC-${numero}`
}

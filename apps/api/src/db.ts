import { criarPrisma } from '@kgb/db'
import { env } from './env'

export const prisma = criarPrisma(env.DATABASE_URL)

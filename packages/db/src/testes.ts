import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { criarPrisma } from './index'
import { semear } from './seed/index'

const PASTA_DB = fileURLToPath(new URL('..', import.meta.url))

export function verificarUrlDeTeste(url: string | undefined): string {
  if (!url) throw new Error('DATABASE_URL_TEST não definida (veja .env.example)')
  const nome = new URL(url).pathname.replace(/^\//, '')
  if (!nome.endsWith('_test')) {
    throw new Error(`DATABASE_URL_TEST precisa apontar para um banco *_test (recebido: ${nome})`)
  }
  return url
}

/** Apaga o schema do banco de teste, aplica as migrations e, se pedido, roda o seed. Nunca roda fora de um banco *_test. */
export async function prepararBancoDeTeste({ semearDados = false } = {}): Promise<string> {
  const url = verificarUrlDeTeste(process.env.DATABASE_URL_TEST)
  const cliente = new pg.Client({ connectionString: url })
  await cliente.connect()
  try {
    await cliente.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  } finally {
    await cliente.end()
  }
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: PASTA_DB,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  })
  if (semearDados) {
    const prisma = criarPrisma(url)
    try {
      await semear(prisma)
    } finally {
      await prisma.$disconnect()
    }
  }
  return url
}

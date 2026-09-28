import './src/carregar-env'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // `prisma generate` não precisa de banco; o fallback vazio deixa o postinstall rodar antes do .env existir.
  datasource: { url: process.env.DATABASE_URL ?? '' },
})

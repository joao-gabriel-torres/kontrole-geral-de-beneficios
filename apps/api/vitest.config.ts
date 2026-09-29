import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? 'segredo-de-teste-com-pelo-menos-32-caracteres',
      BETTER_AUTH_URL: 'http://localhost:3000',
      CORS_ORIGINS:
        'http://localhost:5173,http://localhost:5174,capacitor://localhost,https://localhost',
      TZ: 'America/Sao_Paulo',
    },
    globalSetup: ['./test/preparar-banco.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})

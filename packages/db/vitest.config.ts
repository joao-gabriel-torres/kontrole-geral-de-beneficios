import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

export default defineConfig({
  test: {
    env: { TZ: 'America/Sao_Paulo' },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})

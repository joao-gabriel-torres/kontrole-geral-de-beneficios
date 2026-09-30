import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      server: { deps: { inline: ['vuetify'] } },
      setupFiles: ['./test/configurar.ts'],
      env: { TZ: 'America/Sao_Paulo' },
    },
  }),
)

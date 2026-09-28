import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      server: { deps: { inline: ['vuetify'] } },
      setupFiles: ['./test/configurar.ts'],
      env: { TZ: 'America/Sao_Paulo' },
    },
  }),
)

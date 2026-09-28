import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    environment: 'jsdom',
    server: { deps: { inline: ['vuetify'] } },
    setupFiles: ['./test/configurar.ts'],
    env: { TZ: 'America/Sao_Paulo' },
  },
})

import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    environment: 'jsdom',
    server: { deps: { inline: ['vuetify'] } },
    setupFiles: ['./test/configurar.ts'],
    // Fuso diferente de São Paulo de propósito: os formatos precisam usar America/Sao_Paulo
    // explicitamente, e não o fuso da máquina.
    env: { TZ: 'Asia/Tokyo' },
  },
})

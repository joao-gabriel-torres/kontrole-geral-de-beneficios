import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
  preview: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
})

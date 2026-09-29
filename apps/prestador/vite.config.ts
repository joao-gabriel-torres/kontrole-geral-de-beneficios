import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import vuetify from 'vite-plugin-vuetify'

const raiz = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ mode }) => {
  // Para onde /api vai em dev: permite rodar mais de uma API local (uma por worktree).
  const alvo = loadEnv(mode, raiz, '').API_PROXY_ALVO || 'http://localhost:3000'
  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    envDir: raiz,
    server: { port: 5174, strictPort: true, proxy: { '/api': alvo } },
    preview: { port: 5174, strictPort: true, proxy: { '/api': alvo } },
  }
})

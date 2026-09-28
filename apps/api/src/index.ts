import { serve } from '@hono/node-server'
import { criarApp } from './app'
import { env } from './env'

serve({ fetch: criarApp().fetch, port: env.PORT }, (info) => {
  console.log(`API em http://localhost:${info.port} · documentação em /api/docs`)
})

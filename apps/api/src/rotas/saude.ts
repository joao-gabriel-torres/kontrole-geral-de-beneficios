import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'

const rota = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['Sistema'],
  summary: 'Verifica se a API está no ar',
  responses: {
    200: {
      description: 'API no ar',
      content: {
        'application/json': { schema: z.object({ ok: z.literal(true) }).openapi('Saude') },
      },
    },
  },
})

export const rotasSaude = new OpenAPIHono<Ambiente>().openapi(rota, (c) =>
  c.json({ ok: true as const }, 200),
)

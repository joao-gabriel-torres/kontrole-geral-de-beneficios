import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import { InicioPrestadorSchema } from '../schemas'
import { inicioDoPrestador } from '../servicos/acionamentos'

const rotaInicio = createRoute({
  method: 'get',
  path: '/api/prestador/inicio',
  tags: ['Prestador'],
  summary: 'Próximo atendimento, agenda de hoje, métricas e rota do dia',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('prestador')] as const,
  responses: {
    200: {
      description: 'Início',
      content: { 'application/json': { schema: InicioPrestadorSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só o prestador'),
  },
})

export const rotasPrestador = new OpenAPIHono<Ambiente>().openapi(rotaInicio, async (c) =>
  c.json(await inicioDoPrestador(usuarioLogado(c)), 200),
)

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigeLogin, exigePapel } from '../middlewares/acesso'
import { PrestadorOpcaoSchema, TipoDemandaSchema } from '../schemas'
import { listarPrestadoresAtivos, listarTipos } from '../servicos/acionamentos'

const rotaTipos = createRoute({
  method: 'get',
  path: '/api/tipos',
  tags: ['Catálogo'],
  summary: 'Tipos de demanda com o checklist',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  responses: {
    200: {
      description: 'Tipos',
      content: { 'application/json': { schema: z.array(TipoDemandaSchema) } },
    },
    401: respostaErro('Sem sessão'),
  },
})

const rotaPrestadores = createRoute({
  method: 'get',
  path: '/api/prestadores',
  tags: ['Catálogo'],
  summary: 'Prestadores ativos (seletor do Novo acionamento)',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { query: z.object({ status: z.literal('ativo').optional() }) },
  responses: {
    200: {
      description: 'Prestadores ativos',
      content: { 'application/json': { schema: z.array(PrestadorOpcaoSchema) } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
  },
})

export const rotasCatalogo = new OpenAPIHono<Ambiente>()
  .openapi(rotaTipos, async (c) => c.json(await listarTipos(), 200))
  .openapi(rotaPrestadores, async (c) => c.json(await listarPrestadoresAtivos(), 200))

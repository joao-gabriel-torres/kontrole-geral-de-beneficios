import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { normalizarCep } from '../dominio/cep'
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
  summary: 'Prestadores ativos (seletor do Novo acionamento); com ?cep=, do mais próximo ao mais distante',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: {
    query: z.object({
      status: z.literal('ativo').optional(),
      cep: z
        .string()
        .optional()
        .openapi({ description: 'CEP de referência (8 dígitos, com ou sem hífen)' }),
    }),
  },
  responses: {
    200: {
      description: 'Prestadores ativos',
      content: { 'application/json': { schema: z.array(PrestadorOpcaoSchema) } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    422: respostaErro('CEP malformado'),
  },
})

export const rotasCatalogo = new OpenAPIHono<Ambiente>()
  .openapi(rotaTipos, async (c) => c.json(await listarTipos(), 200))
  .openapi(rotaPrestadores, async (c) => {
    const { cep } = c.req.valid('query')
    return c.json(await listarPrestadoresAtivos(cep ? normalizarCep(cep) : undefined), 200)
  })

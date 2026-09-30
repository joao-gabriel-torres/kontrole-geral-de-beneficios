import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { buscarAssinantes } from '../servicos/assinantes'

export const AssinanteSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    cep: z.string().openapi({ description: 'Só os 8 dígitos' }),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string().nullable(),
    bairro: z.string(),
    cidade: z.string(),
    endereco: z.string().openapi({ description: 'Pronto para exibir: "Logradouro, número · bairro"' }),
  })
  .openapi('Assinante')

const rotaBuscar = createRoute({
  method: 'get',
  path: '/api/assinantes',
  tags: ['Assinantes'],
  summary: 'Assinantes ativos por nome (a busca do Novo acionamento; no máximo 8)',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { query: z.object({ busca: z.string().max(200).optional() }) },
  responses: {
    200: {
      description: 'Assinantes',
      content: { 'application/json': { schema: z.array(AssinanteSchema) } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
  },
})

/** Busca de assinantes (clientes da base de assinaturas) para o Novo acionamento. */
export const rotasAssinantes = new OpenAPIHono<Ambiente>().openapi(rotaBuscar, async (c) =>
  c.json(await buscarAssinantes(c.req.valid('query').busca ?? ''), 200),
)

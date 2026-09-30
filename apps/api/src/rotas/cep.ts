import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { CepIndisponivel, consultarCep } from '../servicos/cep'

export const EnderecoCepSchema = z
  .object({
    cep: z.string().openapi({ description: 'Só os 8 dígitos' }),
    logradouro: z.string().openapi({ description: 'Vazio nos CEPs gerais de cidade' }),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string().openapi({ description: 'Sigla do estado, como "SP"' }),
  })
  .openapi('EnderecoCep')

const rotaConsultar = createRoute({
  method: 'get',
  path: '/api/cep/{cep}',
  tags: ['Assinantes'],
  summary:
    'Endereço de um CEP (ViaCEP), para atendimento em outro endereço e para o cadastro de prestadores',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: {
    params: z.object({
      cep: z.string().openapi({
        param: { name: 'cep', in: 'path' },
        description: '8 dígitos, com ou sem hífen',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Endereço',
      content: { 'application/json': { schema: EnderecoCepSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    404: respostaErro('CEP não encontrado'),
    422: respostaErro('CEP malformado'),
    502: respostaErro('O ViaCEP não respondeu'),
  },
})

/** Consulta de CEP dos modais Novo acionamento e Novo/Editar prestador. */
export const rotasCep = new OpenAPIHono<Ambiente>().openapi(rotaConsultar, async (c) => {
  try {
    return c.json(await consultarCep(c.req.valid('param').cep), 200)
  } catch (erro) {
    if (erro instanceof CepIndisponivel) {
      return c.json(corpoErro('cep_indisponivel', erro.message), 502)
    }
    throw erro
  }
})

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { IdParam, TipoDemandaSchema } from '../schemas'
import { atualizarTipo, criarTipo, excluirTipo } from '../servicos/tipos'

const apenasGestor = exigePapel('gestor')
const tipo = {
  description: 'Tipo de demanda',
  content: { 'application/json': { schema: TipoDemandaSchema } },
}
const acesso = { 401: respostaErro('Sem sessão'), 403: respostaErro('Só para a gestão') }

// Os limites da tela (60 no nome e 200 por etapa, depois do trim) ficam no domínio, com mensagem
// própria; os daqui só barram corpos absurdos.
const NovoTipoSchema = z.object({ nome: z.string().max(500) }).openapi('NovoTipo')
const AtualizacaoTipoSchema = z
  .object({
    nome: z.string().max(500).optional(),
    checklist: z
      .array(z.string().max(1000))
      .max(100)
      .optional()
      .openapi({ description: 'O checklist inteiro, na ordem (etapas vazias são descartadas)' }),
  })
  .openapi('AtualizacaoTipo')

const rotaCriar = createRoute({
  method: 'post',
  path: '/api/tipos',
  tags: ['Catálogo'],
  summary: 'Cria um tipo de demanda (checklist vazio, cor pela paleta)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: {
    body: { content: { 'application/json': { schema: NovoTipoSchema } }, required: true },
  },
  responses: {
    201: tipo,
    ...acesso,
    409: respostaErro('Já existe um tipo com esse nome'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaAtualizar = createRoute({
  method: 'patch',
  path: '/api/tipos/{id}',
  tags: ['Catálogo'],
  summary: 'Renomeia o tipo e/ou grava o checklist inteiro',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: {
    params: IdParam,
    body: { content: { 'application/json': { schema: AtualizacaoTipoSchema } }, required: true },
  },
  responses: {
    200: tipo,
    ...acesso,
    404: respostaErro('Tipo não encontrado'),
    409: respostaErro('Já existe um tipo com esse nome'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaExcluir = createRoute({
  method: 'delete',
  path: '/api/tipos/{id}',
  tags: ['Catálogo'],
  summary: 'Exclui o tipo (os acionamentos já criados não mudam)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: { params: IdParam },
  responses: {
    200: {
      description: 'Excluído',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
    ...acesso,
    404: respostaErro('Tipo não encontrado'),
    409: respostaErro('Último tipo ativo'),
  },
})

/** Tipos de demanda e checklists (criar, editar, excluir). */
export const rotasTipos = new OpenAPIHono<Ambiente>()
  .openapi(rotaCriar, async (c) => c.json(await criarTipo(c.req.valid('json')), 201))
  .openapi(rotaAtualizar, async (c) =>
    c.json(await atualizarTipo(c.req.valid('param').id, c.req.valid('json')), 200),
  )
  .openapi(rotaExcluir, async (c) => c.json(await excluirTipo(c.req.valid('param').id), 200))

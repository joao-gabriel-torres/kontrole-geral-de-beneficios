import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import { TAMANHO_MAXIMO_FOTO } from '../arquivos/imagem'
import type { Ambiente } from '../contexto'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import {
  ConclusaoPatchSchema,
  DetalheAcionamentoSchema,
  EtapaPatchSchema,
  FotoFormSchema,
  FotoSchema,
  IdParam,
  InviavelFormSchema,
} from '../schemas'
import {
  adicionarFoto,
  atualizarConclusao,
  atualizarEtapa,
  enviarParaAprovacao,
  iniciarAtendimento,
  marcarInviavel,
  MAX_FOTOS_INVIABILIDADE,
  removerFoto,
} from '../servicos/acionamentos'

const apenasPrestador = exigePapel('prestador')
const detalhe = {
  description: 'Acionamento atualizado',
  content: { 'application/json': { schema: DetalheAcionamentoSchema } },
}
const errosComuns = {
  401: respostaErro('Sem sessão'),
  403: respostaErro('Só o prestador'),
  404: respostaErro('Não encontrado'),
  409: respostaErro('Status não permite esta ação'),
  422: respostaErro('Dados inválidos'),
}
const EtapaParams = IdParam.extend({
  etapaId: z.string().openapi({ param: { name: 'etapaId', in: 'path' } }),
})
const FotoParams = IdParam.extend({
  fotoId: z.string().openapi({ param: { name: 'fotoId', in: 'path' } }),
})

const acao = (caminho: string, resumo: string) =>
  createRoute({
    method: 'post',
    path: `/api/acionamentos/{id}/${caminho}`,
    tags: ['Execução'],
    summary: resumo,
    security: [{ Bearer: [] }],
    middleware: apenasPrestador,
    request: { params: IdParam },
    responses: { 200: detalhe, ...errosComuns },
  })

const rotaIniciar = acao('iniciar', 'Inicia o atendimento')
const rotaEnviar = acao('enviar', 'Envia para aprovação')

const rotaEtapa = createRoute({
  method: 'patch',
  path: '/api/acionamentos/{id}/etapas/{etapaId}',
  tags: ['Execução'],
  summary: 'Marca a etapa e/ou grava o comentário',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: {
    params: EtapaParams,
    body: { content: { 'application/json': { schema: EtapaPatchSchema } }, required: true },
  },
  responses: { 200: detalhe, ...errosComuns },
})

const rotaConclusao = createRoute({
  method: 'patch',
  path: '/api/acionamentos/{id}/conclusao',
  tags: ['Execução'],
  summary: 'Grava o comentário final para o gestor',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: {
    params: IdParam,
    body: { content: { 'application/json': { schema: ConclusaoPatchSchema } }, required: true },
  },
  responses: { 200: detalhe, ...errosComuns },
})

const limiteFoto = bodyLimit({
  maxSize: TAMANHO_MAXIMO_FOTO + 512 * 1024,
  onError: (c) => c.json(corpoErro('arquivo_grande', 'A foto passa de 10 MB'), 413),
})
const limiteInviavel = bodyLimit({
  maxSize: MAX_FOTOS_INVIABILIDADE * TAMANHO_MAXIMO_FOTO + 512 * 1024,
  onError: (c) => c.json(corpoErro('arquivo_grande', 'As fotos passam do limite'), 413),
})

const rotaFoto = createRoute({
  method: 'post',
  path: '/api/acionamentos/{id}/fotos',
  tags: ['Execução'],
  summary: 'Envia uma foto da etapa ou da conclusão (JPEG, PNG, WebP ou HEIC, até 10 MB)',
  security: [{ Bearer: [] }],
  middleware: [limiteFoto, apenasPrestador],
  request: {
    params: IdParam,
    body: { content: { 'multipart/form-data': { schema: FotoFormSchema } }, required: true },
  },
  responses: {
    201: { description: 'Foto gravada', content: { 'application/json': { schema: FotoSchema } } },
    ...errosComuns,
    413: respostaErro('Foto grande demais'),
    415: respostaErro('Arquivo não é imagem'),
  },
})

const rotaRemoverFoto = createRoute({
  method: 'delete',
  path: '/api/acionamentos/{id}/fotos/{fotoId}',
  tags: ['Execução'],
  summary: 'Remove uma foto da etapa ou da conclusão',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: { params: FotoParams },
  responses: {
    200: {
      description: 'Removida',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
    ...errosComuns,
  },
})

const rotaInviavel = createRoute({
  method: 'post',
  path: '/api/acionamentos/{id}/inviavel',
  tags: ['Execução'],
  summary: 'Marca como inviável (motivo + pelo menos 1 foto)',
  security: [{ Bearer: [] }],
  middleware: [limiteInviavel, apenasPrestador],
  request: {
    params: IdParam,
    body: { content: { 'multipart/form-data': { schema: InviavelFormSchema } }, required: true },
  },
  responses: {
    200: detalhe,
    ...errosComuns,
    413: respostaErro('Fotos grandes demais'),
    415: respostaErro('Arquivo não é imagem'),
  },
})

const comoLista = (valor: unknown): unknown[] =>
  valor === undefined ? [] : Array.isArray(valor) ? valor : [valor]

export const rotasExecucao = new OpenAPIHono<Ambiente>()
  .openapi(rotaIniciar, async (c) =>
    c.json(await iniciarAtendimento(usuarioLogado(c), c.req.valid('param').id), 200),
  )
  .openapi(rotaEnviar, async (c) =>
    c.json(await enviarParaAprovacao(usuarioLogado(c), c.req.valid('param').id), 200),
  )
  .openapi(rotaEtapa, async (c) => {
    const { id, etapaId } = c.req.valid('param')
    return c.json(await atualizarEtapa(usuarioLogado(c), id, etapaId, c.req.valid('json')), 200)
  })
  .openapi(rotaConclusao, async (c) =>
    c.json(
      await atualizarConclusao(
        usuarioLogado(c),
        c.req.valid('param').id,
        c.req.valid('json').comentario,
      ),
      200,
    ),
  )
  .openapi(rotaFoto, async (c) => {
    const form = c.req.valid('form')
    const foto = await adicionarFoto(usuarioLogado(c), c.req.valid('param').id, {
      arquivo: form.arquivo,
      contexto: form.contexto,
      etapaId: form.etapaId,
      tiradaEm: form.tiradaEm,
    })
    return c.json(foto, 201)
  })
  .openapi(rotaRemoverFoto, async (c) => {
    const { id, fotoId } = c.req.valid('param')
    await removerFoto(usuarioLogado(c), id, fotoId)
    return c.json({ ok: true as const }, 200)
  })
  .openapi(rotaInviavel, async (c) => {
    const form = c.req.valid('form')
    const detalheAtualizado = await marcarInviavel(usuarioLogado(c), c.req.valid('param').id, {
      comentario: form.comentario,
      arquivos: comoLista(form.arquivos),
    })
    return c.json(detalheAtualizado, 200)
  })

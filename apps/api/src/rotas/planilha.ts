import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { Ambiente } from '../contexto'
import { TAMANHO_MAXIMO_PLANILHA } from '../dominio/planilha'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import {
  importarPlanilha,
  modeloDaPlanilha,
  planilhaDeCredenciados,
  previaDaPlanilha,
  type ArquivoPlanilha,
} from '../servicos/planilha'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const SELOS = [
  'Novo',
  'Atualizar',
  'Sem nome',
  'Documento inválido',
  'Duplicado na planilha',
  'Telefone inválido',
] as const

export const PreviaPlanilhaSchema = z
  .object({
    linhas: z.array(
      z.object({
        nome: z.string().openapi({ description: 'Como veio na planilha (vazio = sem nome)' }),
        documento: z.string().openapi({ description: 'Como veio na planilha' }),
        especialidades: z
          .array(z.string())
          .openapi({ description: 'Nomes como vieram, inclusive os não reconhecidos' }),
        acao: z.enum(['novo', 'atualizar', 'erro']),
        selo: z.enum(SELOS),
      }),
    ),
    resumo: z.object({
      novos: z.number().int(),
      atualizados: z.number().int(),
      erros: z.number().int(),
    }),
    ausentes: z
      .array(z.object({ id: z.string(), nome: z.string() }))
      .openapi({ description: 'Ativos cujo documento não está na planilha, na ordem de cadastro' }),
  })
  .openapi('PreviaPlanilha')

export const ResultadoImportacaoSchema = z
  .object({
    novos: z.number().int(),
    atualizados: z.number().int(),
    desativados: z.number().int(),
  })
  .openapi('ResultadoImportacao')

const ArquivoPlanilhaSchema = z.object({
  // opcional no schema: a ausência vira o erro de domínio `arquivo_obrigatorio` no serviço
  arquivo: z
    .any()
    .optional()
    .openapi({ type: 'string', format: 'binary', description: '.xlsx, .xls ou .csv, até 5 MB' }),
})
const ImportacaoFormSchema = ArquivoPlanilhaSchema.extend({
  desativarAusentes: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Desativa os ativos que não estão na planilha (padrão: false)' }),
})

const apenasGestor = exigePapel('gestor')
const limitePlanilha = bodyLimit({
  maxSize: TAMANHO_MAXIMO_PLANILHA + 64 * 1024,
  onError: (c) => c.json(corpoErro('planilha_grande', 'A planilha passa de 5 MB'), 413),
})
const errosDeAcesso = {
  401: respostaErro('Sem sessão'),
  403: respostaErro('Só para a gestão'),
}
const errosDoArquivo = {
  413: respostaErro('Planilha acima de 5 MB'),
  422: respostaErro('Sem arquivo, ilegível, sem linhas ou acima de 2000 linhas'),
}
const arquivoXlsx = (descricao: string) => ({
  description: descricao,
  content: { [XLSX_MIME]: { schema: z.string().openapi({ type: 'string', format: 'binary' }) } },
})

const rotaPrevia = createRoute({
  method: 'post',
  path: '/api/prestadores/planilha/previa',
  tags: ['Prestadores'],
  summary: 'Confere a planilha sem gravar: selo de cada linha, resumo e ausentes',
  security: [{ Bearer: [] }],
  middleware: [limitePlanilha, apenasGestor],
  request: {
    body: {
      content: { 'multipart/form-data': { schema: ArquivoPlanilhaSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Prévia da importação',
      content: { 'application/json': { schema: PreviaPlanilhaSchema } },
    },
    ...errosDeAcesso,
    ...errosDoArquivo,
  },
})

const rotaImportacao = createRoute({
  method: 'post',
  path: '/api/prestadores/planilha/importacao',
  tags: ['Prestadores'],
  summary: 'Importa a planilha numa transação (recalcula a prévia) e grava a auditoria',
  security: [{ Bearer: [] }],
  middleware: [limitePlanilha, apenasGestor],
  request: {
    body: {
      content: { 'multipart/form-data': { schema: ImportacaoFormSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Contagens aplicadas',
      content: { 'application/json': { schema: ResultadoImportacaoSchema } },
    },
    ...errosDeAcesso,
    409: respostaErro('Os cadastros mudaram durante a importação'),
    ...errosDoArquivo,
  },
})

const rotaExportacao = createRoute({
  method: 'get',
  path: '/api/prestadores/planilha',
  tags: ['Prestadores'],
  summary: 'Exporta os prestadores não excluídos (credenciados-russo-DD-MM-AAAA.xlsx)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  responses: { 200: arquivoXlsx('Planilha de credenciados'), ...errosDeAcesso },
})

const rotaModelo = createRoute({
  method: 'get',
  path: '/api/prestadores/planilha/modelo',
  tags: ['Prestadores'],
  summary: 'Modelo da planilha (modelo-credenciados-russo.xlsx)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  responses: {
    200: arquivoXlsx('Modelo com o cabeçalho e uma linha de exemplo'),
    ...errosDeAcesso,
  },
})

const baixar = (c: Context<Ambiente>, { nome, conteudo }: ArquivoPlanilha) =>
  c.body(conteudo, 200, {
    'Content-Type': XLSX_MIME,
    'Content-Disposition': `attachment; filename="${nome}"`,
  })

/** Planilha de credenciados (prévia e confirmação da importação, exportação e modelo). */
export const rotasPlanilha = new OpenAPIHono<Ambiente>()
  .openapi(rotaPrevia, async (c) =>
    c.json(await previaDaPlanilha(c.req.valid('form').arquivo), 200),
  )
  .openapi(rotaImportacao, async (c) => {
    const form = c.req.valid('form')
    const resultado = await importarPlanilha(form.arquivo, {
      desativarAusentes: form.desativarAusentes === 'true',
      autor: usuarioLogado(c),
    })
    return c.json(resultado, 200)
  })
  .openapi(rotaExportacao, async (c) => baixar(c, await planilhaDeCredenciados()))
  .openapi(rotaModelo, (c) => baixar(c, modeloDaPlanilha()))

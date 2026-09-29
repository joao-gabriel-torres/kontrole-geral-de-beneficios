import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { painelDoGestor } from '../servicos/painel'

const DataSchema = z.string().openapi({ example: '2026-09-29' })
const RevisoesSchema = z.object({
  aprovadas: z.number().int(),
  total: z.number().int(),
})
const MinutosSchema = z.number().nullable().openapi({
  description: 'Média de (1º envio − início) em minutos, com fração; null sem dados',
  example: 106.15,
})

const PainelGestorSchema = z
  .object({
    hoje: DataSchema,
    periodo: z.union([z.literal(7), z.literal(30)]),
    emAberto: z.number().int().openapi({ description: 'Aberto, em execução ou reprovado' }),
    paraHoje: z.number().int().openapi({ description: 'Atendimentos de hoje não aprovados' }),
    aguardando: z.number().int(),
    aprovacao: RevisoesSchema,
    tempoMedioMin: MinutosSchema,
    inviaveis: z.object({ quantidade: z.number().int(), totalPeriodo: z.number().int() }),
    volume: z.array(
      z.object({ data: DataSchema, total: z.number().int(), aprovados: z.number().int() }),
    ),
    reprovacoesPorTipo: z.array(
      z.object({
        tipoNome: z.string(),
        reprovacoes: z.number().int(),
        demandas: z.number().int(),
      }),
    ),
    ranking: z.array(
      z.object({
        prestador: z.object({ id: z.string(), nome: z.string(), cor: z.string() }),
        concluidos: z.number().int(),
        revisoes: RevisoesSchema,
        tempoMedioMin: MinutosSchema,
      }),
    ),
  })
  .openapi('PainelGestor')

const FiltroPainelSchema = z.object({
  periodo: z
    .enum(['7', '30'])
    .default('7')
    .openapi({ param: { name: 'periodo', in: 'query' }, description: 'Últimos 7 ou 30 dias' }),
})

const rotaPainel = createRoute({
  method: 'get',
  path: '/api/painel',
  tags: ['Painel'],
  summary: 'KPIs, volume por dia, reprovações por tipo e ranking do período',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { query: FiltroPainelSchema },
  responses: {
    200: {
      description: 'Painel do gestor',
      content: { 'application/json': { schema: PainelGestorSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    422: respostaErro('Período inválido'),
  },
})

/** Painel do gestor (GET /api/painel). */
export const rotasPainel = new OpenAPIHono<Ambiente>().openapi(rotaPainel, async (c) => {
  const { periodo } = c.req.valid('query')
  return c.json(await painelDoGestor(periodo === '30' ? 30 : 7), 200)
})

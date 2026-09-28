import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { prisma } from '../db'
import { respostaErro } from '../erros'
import { exigeLogin, usuarioLogado } from '../middlewares/acesso'
import {
  DetalheAcionamentoSchema,
  FiltroListaSchema,
  IdParam,
  ResumoAcionamentoSchema,
} from '../schemas'
import { detalharAcionamento, listarAcionamentos } from '../servicos/acionamentos'

const ContagemSchema = z
  .object({
    aberto: z.number().int(),
    em_andamento: z.number().int(),
    aguardando: z.number().int(),
    reprovado: z.number().int(),
    aprovado: z.number().int(),
  })
  .openapi('ContagemAcionamentos')

type Contagem = z.infer<typeof ContagemSchema>

const rotaContagem = createRoute({
  method: 'get',
  path: '/api/acionamentos/contagem',
  tags: ['Acionamentos'],
  summary: 'Quantidade de acionamentos por status (o prestador vê só os seus)',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  responses: {
    200: {
      description: 'Contagem por status',
      content: { 'application/json': { schema: ContagemSchema } },
    },
    401: respostaErro('Sem sessão'),
  },
})

const rotaLista = createRoute({
  method: 'get',
  path: '/api/acionamentos',
  tags: ['Acionamentos'],
  summary: 'Lista (o prestador vê só os seus), do mais recente para o mais antigo',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  request: { query: FiltroListaSchema },
  responses: {
    200: {
      description: 'Acionamentos',
      content: { 'application/json': { schema: z.array(ResumoAcionamentoSchema) } },
    },
    401: respostaErro('Sem sessão'),
  },
})

const rotaDetalhe = createRoute({
  method: 'get',
  path: '/api/acionamentos/{id}',
  tags: ['Acionamentos'],
  summary: 'Detalhe com etapas, fotos, revisões e linha do tempo',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  request: { params: IdParam },
  responses: {
    200: {
      description: 'Detalhe',
      content: { 'application/json': { schema: DetalheAcionamentoSchema } },
    },
    401: respostaErro('Sem sessão'),
    404: respostaErro('Não encontrado'),
  },
})

export const rotasAcionamentos = new OpenAPIHono<Ambiente>()
  .openapi(rotaContagem, async (c) => {
    const u = usuarioLogado(c)
    const contagem: Contagem = {
      aberto: 0,
      em_andamento: 0,
      aguardando: 0,
      reprovado: 0,
      aprovado: 0,
    }
    if (u.papel === 'prestador' && !u.prestadorId) return c.json(contagem, 200)
    const grupos = await prisma.acionamento.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: u.papel === 'prestador' ? { prestadorId: u.prestadorId! } : {},
    })
    for (const g of grupos) contagem[g.status] = g._count._all
    return c.json(contagem, 200)
  })
  .openapi(rotaLista, async (c) =>
    c.json(await listarAcionamentos(usuarioLogado(c), c.req.valid('query')), 200),
  )
  .openapi(rotaDetalhe, async (c) =>
    c.json(await detalharAcionamento(usuarioLogado(c), c.req.valid('param').id), 200),
  )

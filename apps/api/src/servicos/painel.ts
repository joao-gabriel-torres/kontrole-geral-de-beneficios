import { prisma } from '../db'
import { dataSP } from '../dominio/datas'
import { calcularPainel, diasDoPeriodo, type Painel, type Periodo } from '../dominio/painel'

/** A coluna `data` é `@db.Date`: meia-noite UTC do dia. */
const diaDoBanco = (iso: string) => new Date(`${iso}T00:00:00Z`)
const isoDoBanco = (d: Date) => d.toISOString().slice(0, 10)

/** Painel do gestor: lê o mínimo do banco e deixa as regras (e os arredondamentos) no domínio. */
export async function painelDoGestor(periodo: Periodo, agora = new Date()): Promise<Painel> {
  const hoje = dataSP(agora)
  const inicio = diasDoPeriodo(hoje, periodo)[0]!
  const [pendentes, doPeriodo, prestadores] = await Promise.all([
    prisma.acionamento.findMany({
      where: { status: { not: 'aprovado' } },
      select: { data: true, status: true },
    }),
    prisma.acionamento.findMany({
      where: { data: { gte: diaDoBanco(inicio), lte: diaDoBanco(hoje) } },
      orderBy: { numero: 'asc' },
      select: {
        numero: true,
        data: true,
        status: true,
        inviavel: true,
        prestadorId: true,
        iniciadoEm: true,
        eventos: {
          where: { tipo: { in: ['enviado', 'inviabilidade_enviada'] } },
          orderBy: { em: 'asc' },
          take: 1,
          select: { em: true },
        },
        revisoes: { orderBy: [{ em: 'asc' }, { id: 'asc' }], select: { decisao: true } },
        demandas: { orderBy: { ordem: 'asc' }, select: { tipoNome: true } },
      },
    }),
    prisma.prestador.findMany({
      where: { excluidoEm: null },
      orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
      select: { id: true, nome: true, cor: true, status: true },
    }),
  ])
  return calcularPainel({
    hoje,
    periodo,
    pendentes: pendentes.map((a) => ({ data: isoDoBanco(a.data), status: a.status })),
    doPeriodo: doPeriodo.map((a) => ({
      numero: a.numero,
      data: isoDoBanco(a.data),
      status: a.status,
      inviavel: a.inviavel,
      prestadorId: a.prestadorId,
      iniciadoEm: a.iniciadoEm,
      primeiroEnvioEm: a.eventos[0]?.em ?? null,
      revisoes: a.revisoes.map((r) => r.decisao),
      tipos: a.demandas.map((d) => d.tipoNome),
    })),
    prestadores,
  })
}

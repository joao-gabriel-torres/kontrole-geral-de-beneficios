import type { Decisao, StatusAcionamento } from './acionamento'

export type Periodo = 7 | 30

/** Acionamento como o Painel precisa dele. */
export interface AcionamentoPainel {
  numero: number
  /** Data do atendimento, "YYYY-MM-DD": é ela que define o período. */
  data: string
  status: StatusAcionamento
  inviavel: boolean
  prestadorId: string
  iniciadoEm: Date | null
  /** Primeiro envio (para aprovação ou de inviabilidade). */
  primeiroEnvioEm: Date | null
  /** Decisões das revisões, em ordem cronológica. */
  revisoes: readonly Decisao[]
  /** Nome gravado em cada demanda (snapshot), na ordem das demandas. */
  tipos: readonly string[]
}

export interface PrestadorPainel {
  id: string
  nome: string
  cor: string
  status: 'ativo' | 'inativo'
}

export interface PendentePainel {
  data: string
  status: StatusAcionamento
}

export interface EntradaPainel {
  hoje: string
  periodo: Periodo
  /** Acionamentos não aprovados, de qualquer data (os KPIs de situação ignoram o período). */
  pendentes: readonly PendentePainel[]
  /** Acionamentos do período; os de outras datas são ignorados. */
  doPeriodo: readonly AcionamentoPainel[]
  /** Prestadores não excluídos, na ordem de cadastro (desempate do ranking). */
  prestadores: readonly PrestadorPainel[]
}

export interface ContagemRevisoes {
  aprovadas: number
  total: number
}

export interface Painel {
  hoje: string
  periodo: Periodo
  emAberto: number
  paraHoje: number
  aguardando: number
  aprovacao: ContagemRevisoes
  /** Média de (1º envio − início) em minutos, com fração; `null` sem dados. */
  tempoMedioMin: number | null
  inviaveis: { quantidade: number; totalPeriodo: number }
  volume: { data: string; total: number; aprovados: number }[]
  reprovacoesPorTipo: { tipoNome: string; reprovacoes: number; demandas: number }[]
  ranking: {
    prestador: { id: string; nome: string; cor: string }
    concluidos: number
    revisoes: ContagemRevisoes
    tempoMedioMin: number | null
  }[]
}

const DIA_MS = 86_400_000

/** Os últimos `periodo` dias contando hoje, do mais antigo para hoje ("YYYY-MM-DD"). */
export function diasDoPeriodo(hoje: string, periodo: Periodo): string[] {
  const base = Date.parse(`${hoje}T00:00:00Z`)
  return Array.from({ length: periodo }, (_, i) =>
    new Date(base - (periodo - 1 - i) * DIA_MS).toISOString().slice(0, 10),
  )
}

const aprovadoDeFato = (a: AcionamentoPainel) => a.status === 'aprovado' && !a.inviavel

function contarRevisoes(lista: readonly AcionamentoPainel[]): ContagemRevisoes {
  const decisoes = lista.flatMap((a) => a.revisoes)
  return { aprovadas: decisoes.filter((d) => d === 'aprovado').length, total: decisoes.length }
}

function tempoMedio(lista: readonly AcionamentoPainel[]): number | null {
  const tempos = lista.flatMap((a) =>
    a.iniciadoEm && a.primeiroEnvioEm
      ? [(a.primeiroEnvioEm.getTime() - a.iniciadoEm.getTime()) / 60_000]
      : [],
  )
  return tempos.length ? tempos.reduce((s, t) => s + t, 0) / tempos.length : null
}

function reprovacoesPorTipo(lista: readonly AcionamentoPainel[]): Painel['reprovacoesPorTipo'] {
  // A ordem de inserção do Map é a da primeira aparição: número do acionamento, ordem da demanda.
  const emOrdem = [...lista].sort((a, b) => a.numero - b.numero)
  const reprovacoes = new Map<string, number>()
  const demandas = new Map<string, number>()
  for (const a of emOrdem) {
    for (const tipo of a.tipos) demandas.set(tipo, (demandas.get(tipo) ?? 0) + 1)
    for (const decisao of a.revisoes) {
      if (decisao !== 'reprovado') continue
      for (const tipo of a.tipos) reprovacoes.set(tipo, (reprovacoes.get(tipo) ?? 0) + 1)
    }
  }
  return [...reprovacoes]
    .map(([tipoNome, n]) => ({ tipoNome, reprovacoes: n, demandas: demandas.get(tipoNome)! }))
    .sort((a, b) => b.reprovacoes - a.reprovacoes)
}

function ranking(
  prestadores: readonly PrestadorPainel[],
  lista: readonly AcionamentoPainel[],
): Painel['ranking'] {
  const taxa = (r: ContagemRevisoes) => (r.total ? r.aprovadas / r.total : 0)
  return prestadores
    .map((p) => ({ p, deles: lista.filter((a) => a.prestadorId === p.id) }))
    .filter(({ p, deles }) => p.status === 'ativo' || deles.length > 0)
    .map(({ p, deles }) => ({
      prestador: { id: p.id, nome: p.nome, cor: p.cor },
      concluidos: deles.filter(aprovadoDeFato).length,
      revisoes: contarRevisoes(deles),
      tempoMedioMin: tempoMedio(deles),
    }))
    .sort((a, b) => b.concluidos - a.concluidos || taxa(b.revisoes) - taxa(a.revisoes))
}

/** Regras do Painel do gestor, iguais às de `vGestor` no protótipo. */
export function calcularPainel(e: EntradaPainel): Painel {
  const dias = diasDoPeriodo(e.hoje, e.periodo)
  const inicio = dias[0]!
  const lista = e.doPeriodo.filter((a) => a.data >= inicio && a.data <= e.hoje)
  const pendentes = e.pendentes.filter((a) => a.status !== 'aprovado')
  return {
    hoje: e.hoje,
    periodo: e.periodo,
    emAberto: pendentes.filter((a) => ['aberto', 'em_andamento', 'reprovado'].includes(a.status))
      .length,
    paraHoje: pendentes.filter((a) => a.data === e.hoje).length,
    aguardando: pendentes.filter((a) => a.status === 'aguardando').length,
    aprovacao: contarRevisoes(lista),
    tempoMedioMin: tempoMedio(lista),
    inviaveis: { quantidade: lista.filter((a) => a.inviavel).length, totalPeriodo: lista.length },
    volume: dias.map((data) => {
      const doDia = lista.filter((a) => a.data === data)
      return { data, total: doDia.length, aprovados: doDia.filter(aprovadoDeFato).length }
    }),
    reprovacoesPorTipo: reprovacoesPorTipo(lista),
    ranking: ranking(e.prestadores, lista),
  }
}

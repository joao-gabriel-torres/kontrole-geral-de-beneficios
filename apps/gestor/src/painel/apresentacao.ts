import type { components, ResumoAcionamento } from '@kgb/api-client'
import type { StatusAcionamento } from '@kgb/ui'
import type { RouteLocationRaw } from 'vue-router'
import { enviadoEm, ordenarFila } from '../aprovacoes/fila'
import { duracao, percentual, rotuloDaBarra } from './formatos'

export type PainelGestor = components['schemas']['PainelGestor']

export interface Kpi {
  rotulo: string
  valor: string
  sub: string
  destino?: RouteLocationRaw
}

/** Os 5 cartões do topo, com os textos do protótipo. */
export function kpisDoPainel(p: PainelGestor): Kpi[] {
  const { aprovadas, total } = p.aprovacao
  return [
    {
      rotulo: 'Acionamentos em aberto',
      valor: String(p.emAberto),
      sub: `${p.paraHoje} para hoje`,
      destino: { name: 'acionamentos' },
    },
    {
      rotulo: 'Aguardando aprovação',
      valor: String(p.aguardando),
      sub: 'Na sua fila',
      destino: { name: 'aprovacoes' },
    },
    {
      rotulo: 'Taxa de aprovação',
      valor: `${percentual(aprovadas, total)}%`,
      sub: `${aprovadas} de ${total} ${total === 1 ? 'análise' : 'análises'}`,
    },
    {
      rotulo: 'Tempo médio de conclusão',
      valor: duracao(p.tempoMedioMin),
      sub: 'Do início ao envio',
    },
    {
      rotulo: 'Demandas inviáveis',
      valor: String(p.inviaveis.quantidade),
      sub: `${percentual(p.inviaveis.quantidade, p.inviaveis.totalPeriodo)}% do período`,
    },
  ]
}

export interface Barra {
  chave: string
  numero: string
  altura: string
  alturaAprovados: string
  rotulo: string
  fundo: string
}

/** Barras do "Volume por período": altura relativa ao maior dia, com mínimo de 4%. */
export function barrasDoVolume(p: PainelGestor): Barra[] {
  const maior = Math.max(1, ...p.volume.map((v) => v.total))
  return p.volume.map((v, i) => ({
    chave: v.data,
    numero: v.total ? String(v.total) : '',
    altura: `${Math.max(4, (v.total / maior) * 100)}%`,
    alturaAprovados: `${v.total ? (v.aprovados / v.total) * 100 : 0}%`,
    rotulo: rotuloDaBarra(v.data, i, p.periodo),
    fundo: v.total ? '#CCE1F2' : '#EFF1F3',
  }))
}

export interface LinhaReprovacao {
  nome: string
  taxa: string
  total: string
  largura: string
}

export function linhasDeReprovacao(p: PainelGestor): LinhaReprovacao[] {
  const maior = Math.max(1, ...p.reprovacoesPorTipo.map((r) => r.reprovacoes))
  return p.reprovacoesPorTipo.map((r) => ({
    nome: r.tipoNome,
    taxa: `${percentual(r.reprovacoes, r.demandas)}% das demandas`,
    total: String(r.reprovacoes),
    largura: `${(r.reprovacoes / maior) * 100}%`,
  }))
}

export interface LinhaRanking {
  id: string
  posicao: string
  destaque: boolean
  nome: string
  cor: string
  concluidos: string
  aprovacao: string
  tempo: string
}

export function linhasDoRanking(p: PainelGestor): LinhaRanking[] {
  return p.ranking.map((r, i) => ({
    id: r.prestador.id,
    posicao: `${i + 1}º`,
    destaque: i === 0,
    nome: r.prestador.nome,
    cor: r.prestador.cor,
    concluidos: String(r.concluidos),
    aprovacao: r.revisoes.total ? `${percentual(r.revisoes.aprovadas, r.revisoes.total)}%` : '—',
    tempo: duracao(r.tempoMedioMin),
  }))
}

export interface ItemFila {
  id: string
  titulo: string
  linha: string
  prestador: ResumoAcionamento['prestador']
  status: StatusAcionamento
  inviavel: boolean
}

/** Os 4 que esperam há mais tempo, com "AC-1059 · Enviado 28/09 · 10:30". */
export function itensDaFila(lista: readonly ResumoAcionamento[]): ItemFila[] {
  return ordenarFila(lista)
    .slice(0, 4)
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      linha: [a.codigo, enviadoEm(a)].filter(Boolean).join(' · '),
      prestador: a.prestador,
      status: a.status,
      inviavel: a.inviavel,
    }))
}

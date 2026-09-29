import type { Decisao, StatusAcionamento } from './acionamento'

export interface ItemAgenda {
  id: string
  data: string
  inicio: string
  status: StatusAcionamento
  inviavel: boolean
  endereco: string
  /** Decisões das revisões, em ordem cronológica. */
  revisoes: Decisao[]
}

export interface MetricasInicio {
  hoje: number
  noMes: number
  aprovacao: { taxa: number; dePrimeira: number | null }
  paraCorrigir: number
}

/** Regras do Início do prestador, iguais às de `vPro` no protótipo. */
export function calcularInicio(itens: readonly ItemAgenda[], hoje: string) {
  const ordenados = [...itens].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
  const proximo =
    ordenados.find((a) => a.status === 'em_andamento') ??
    ordenados.find((a) => a.status === 'aberto' && a.data >= hoje) ??
    null
  const deHoje = ordenados.filter((a) => a.data === hoje)
  const mes = hoje.slice(0, 7)
  const revisoes = ordenados.flatMap((a) => a.revisoes)
  const aprovadas = revisoes.filter((r) => r === 'aprovado').length
  const revisados = ordenados.filter((a) => a.revisoes.length > 0)
  const metricas: MetricasInicio = {
    hoje: deHoje.length,
    noMes: ordenados.filter((a) => a.data.startsWith(mes) && a.status === 'aprovado' && !a.inviavel)
      .length,
    aprovacao: {
      taxa: revisoes.length ? Math.round((aprovadas / revisoes.length) * 100) : 0,
      dePrimeira: revisados.length
        ? Math.round(
            (revisados.filter((a) => a.revisoes[0] === 'aprovado').length / revisados.length) * 100,
          )
        : null,
    },
    paraCorrigir: ordenados.filter((a) => a.status === 'reprovado').length,
  }
  return {
    proximoId: proximo?.id ?? null,
    hojeIds: deHoje.map((a) => a.id),
    metricas,
    rotaDoDia: deHoje
      .filter((a) => a.status === 'aberto' || a.status === 'em_andamento')
      .map((a) => a.endereco),
  }
}

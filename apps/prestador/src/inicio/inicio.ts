import type { InicioPrestador, ResumoAcionamento } from '@kgb/api-client'
import type { ParadaRota } from '@kgb/ui'

export interface CartaoMetrica {
  rotulo: string
  valor: string
  sub: string
  /** Fundo coral e texto vermelho ("Para corrigir" com reprovados). */
  destaque: boolean
}

/** As quatro métricas do Início, como `metrics` em `vPro` no protótipo. */
export function cartoesMetricas(m: InicioPrestador['metricas']): CartaoMetrica[] {
  const dePrimeira = m.aprovacao.dePrimeira === null ? '—' : `${m.aprovacao.dePrimeira}%`
  return [
    { rotulo: 'Hoje', valor: String(m.hoje), sub: 'atendimentos', destaque: false },
    { rotulo: 'No mês', valor: String(m.noMes), sub: 'aprovados', destaque: false },
    {
      rotulo: 'Aprovação',
      valor: `${m.aprovacao.taxa}%`,
      sub: `de primeira: ${dePrimeira}`,
      destaque: false,
    },
    {
      rotulo: 'Para corrigir',
      valor: String(m.paraCorrigir),
      sub: 'reprovados',
      destaque: m.paraCorrigir > 0,
    },
  ]
}

export function rotuloProximo(status: ResumoAcionamento['status']): string {
  return status === 'em_andamento' ? 'Em execução agora' : 'Próximo atendimento'
}

/** Os status que a API põe na rota do dia: o que ainda falta atender hoje. */
const NA_ROTA: readonly ResumoAcionamento['status'][] = ['aberto', 'em_andamento']

type AcionamentoDaRota = Pick<
  ResumoAcionamento,
  'id' | 'endereco' | 'status' | 'latitude' | 'longitude'
>

/**
 * As paradas da rota do dia: os endereços da API, na ordem, cada um com a posição conferida no
 * mapa do acionamento de hoje que ele representa (o próximo ainda não usado com o mesmo endereço),
 * quando há. Sem acionamento correspondente ou sem posição, a parada é só o endereço.
 */
export function paradasDaRota(
  rotaDoDia: readonly string[],
  hoje: readonly AcionamentoDaRota[],
): (string | ParadaRota)[] {
  const pendentes = hoje.filter((a) => NA_ROTA.includes(a.status))
  const usados = new Set<string>()
  return rotaDoDia.map((endereco) => {
    const a = pendentes.find((p) => p.endereco === endereco && !usados.has(p.id))
    if (!a) return endereco
    usados.add(a.id)
    return a.latitude != null && a.longitude != null
      ? { endereco, latitude: a.latitude, longitude: a.longitude }
      : endereco
  })
}

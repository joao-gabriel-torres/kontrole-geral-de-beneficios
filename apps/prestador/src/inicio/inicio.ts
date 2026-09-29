import type { InicioPrestador, ResumoAcionamento } from '@kgb/api-client'

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

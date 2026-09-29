export type Periodo = 7 | 30

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * Minutos → "1h46". Arredonda os minutos totais antes de dividir (o protótipo arredondava só o
 * resto e podia mostrar "1h60"); o .5 sobe. Sem dados, travessão.
 */
export function duracao(minutos: number | null): string {
  if (minutos === null) return '—'
  const total = Math.round(minutos)
  return `${Math.floor(total / 60)}h${doisDigitos(total % 60)}`
}

/** Percentual inteiro (o .5 sobe); 0 quando não há total. */
export function percentual(parte: number, total: number): number {
  return total ? Math.round((parte / total) * 100) : 0
}

/**
 * Rótulo embaixo da barra do dia: em 7 dias, o dia da semana; em 30, o dia do mês nos índices
 * 0, 5, 10… e no último (hoje), como no protótipo.
 */
export function rotuloDaBarra(data: string, indice: number, periodo: Periodo): string {
  if (periodo === 7) return DIAS_CURTOS[new Date(`${data}T00:00:00Z`).getUTCDay()]!
  return indice % 5 === 0 || indice === periodo - 1 ? data.slice(8, 10) : ''
}

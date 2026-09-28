import type { ContagemAcionamentos } from '@kgb/api-client'

export type FiltroLista =
  'todos' | 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'finalizados'

export type StatusConsulta = Exclude<FiltroLista, 'todos'>

/** O filtro vira o parâmetro `status` da API ("Todos" não filtra). */
export function statusDaConsulta(filtro: FiltroLista): StatusConsulta | undefined {
  return filtro === 'todos' ? undefined : filtro
}

export const FILTROS: readonly { id: FiltroLista; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'aberto', rotulo: 'Agendados' },
  { id: 'em_andamento', rotulo: 'Em execução' },
  { id: 'aguardando', rotulo: 'Aguardando' },
  { id: 'reprovado', rotulo: 'Reprovados' },
  { id: 'finalizados', rotulo: 'Finalizados' },
]

/** Número do chip. "Todos" soma todos os status; "Finalizados" são os aprovados (inviáveis inclusive). */
export function contagemDoFiltro(
  c: ContagemAcionamentos | undefined,
  filtro: FiltroLista,
): number | null {
  if (!c) return null
  if (filtro === 'todos') return c.aberto + c.em_andamento + c.aguardando + c.reprovado + c.aprovado
  if (filtro === 'finalizados') return c.aprovado
  return c[filtro]
}

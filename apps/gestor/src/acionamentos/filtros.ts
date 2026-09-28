export type FiltroLista =
  'todos' | 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'finalizados'

export type StatusConsulta = Exclude<FiltroLista, 'todos'>

/** O filtro vira o parâmetro `status` da API ("Todos" não filtra). */
export function statusDaConsulta(filtro: FiltroLista): StatusConsulta | undefined {
  return filtro === 'todos' ? undefined : filtro
}

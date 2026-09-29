import type { ResumoAcionamento } from '@kgb/api-client'

export type Filtro = 'ativas' | 'corrigir' | 'analise' | 'finalizadas'

type Status = ResumoAcionamento['status']

/** Filtros de Demandas, como `fDef` em `vPro` no protótipo. */
export const FILTROS: readonly { id: Filtro; rotulo: string; status: readonly Status[] }[] = [
  { id: 'ativas', rotulo: 'Ativas', status: ['aberto', 'em_andamento'] },
  { id: 'corrigir', rotulo: 'Corrigir', status: ['reprovado'] },
  { id: 'analise', rotulo: 'Em análise', status: ['aguardando'] },
  { id: 'finalizadas', rotulo: 'Finalizadas', status: ['aprovado'] },
]

/** Quantas finalizadas aparecem na lista (as mais recentes). */
export const LIMITE_FINALIZADAS = 20

export function filtroDaQuery(valor: unknown): Filtro {
  return FILTROS.find((f) => f.id === valor)?.id ?? 'ativas'
}

/** Do mais antigo para o mais novo, por data e horário de início. */
export function ordenarPorData<T extends Pick<ResumoAcionamento, 'data' | 'inicio'>>(
  lista: readonly T[],
): T[] {
  return [...lista].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
}

function doFiltro<T extends Pick<ResumoAcionamento, 'status'>>(
  lista: readonly T[],
  filtro: Filtro,
) {
  const { status } = FILTROS.find((f) => f.id === filtro)!
  return lista.filter((a) => status.includes(a.status))
}

export function filtrar<T extends Pick<ResumoAcionamento, 'data' | 'inicio' | 'status'>>(
  lista: readonly T[],
  filtro: Filtro,
): T[] {
  const selecionados = doFiltro(ordenarPorData(lista), filtro)
  return filtro === 'finalizadas'
    ? selecionados.reverse().slice(0, LIMITE_FINALIZADAS)
    : selecionados
}

export function contar(
  lista: readonly Pick<ResumoAcionamento, 'status'>[],
): Record<Filtro, number> {
  return Object.fromEntries(FILTROS.map((f) => [f.id, doFiltro(lista, f.id).length])) as Record<
    Filtro,
    number
  >
}

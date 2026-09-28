import { QueryClient } from '@tanstack/vue-query'
import type { FiltroLista } from './acionamentos/filtros'

export function criarClienteConsultas(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5_000 } } })
}

/**
 * Chaves das consultas. Tudo que depende de acionamentos começa com 'acionamentos', e as mutações
 * invalidam esse prefixo: lista, contagem (badge) e detalhe se atualizam juntos.
 */
export const CHAVES = {
  acionamentos: ['acionamentos'] as const,
  lista: (filtro: FiltroLista, busca: string) => ['acionamentos', 'lista', filtro, busca] as const,
  contagem: ['acionamentos', 'contagem'] as const,
  detalhe: (id: string) => ['acionamentos', 'detalhe', id] as const,
  tipos: ['tipos'] as const,
  prestadoresAtivos: ['prestadores', 'ativos'] as const,
}

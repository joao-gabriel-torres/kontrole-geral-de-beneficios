import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import type { FiltroLista } from './acionamentos/filtros'
import { ErroApi } from './erros'

/** `aoPerderSessao` é chamado quando a API recusa a sessão (401) numa consulta ou numa ação. */
export function criarClienteConsultas(aoPerderSessao?: () => void): QueryClient {
  const aoErro = (erro: unknown) => {
    if (erro instanceof ErroApi && erro.status === 401) aoPerderSessao?.()
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: aoErro }),
    mutationCache: new MutationCache({ onError: aoErro }),
    defaultOptions: { queries: { retry: 1, staleTime: 5_000 } },
  })
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

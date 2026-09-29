import { comTempoLimite, ErroTempoEsgotado } from '@kgb/api-client'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import type { FiltroLista } from './acionamentos/filtros'
import { ErroApi } from './erros'

/** Quantas vezes uma consulta que falhou por 5xx ou por falha de rede é repetida. */
export const REPETICOES = 1

/**
 * Política de repetição das consultas. Um 4xx é resposta definitiva (404, 401, 403…): repetir só
 * atrasaria o aviso e a volta ao login. O tempo esgotado também não repete, porque a gestora já
 * esperou o limite inteiro.
 */
export function deveRepetir(falhas: number, erro: unknown): boolean {
  if (falhas >= REPETICOES || erro instanceof ErroTempoEsgotado) return false
  return !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500)
}

/**
 * Chamada de dados com tempo limite: sem resposta em 8 s, o pedido é abortado e a consulta ou a
 * ação falha com `ErroTempoEsgotado`, que `mensagemDeErro` mostra como falha de conexão. O `sinal`
 * do vue-query (cancelamento ao sair da tela) continua abortando o pedido.
 */
export function comLimite<T>(
  executar: (sinal: AbortSignal) => Promise<T>,
  sinal?: AbortSignal,
): Promise<T> {
  return comTempoLimite((limite) => executar(sinal ? AbortSignal.any([sinal, limite]) : limite))
}

/** `aoPerderSessao` é chamado quando a API recusa a sessão (401) numa consulta ou numa ação. */
export function criarClienteConsultas(aoPerderSessao?: () => void): QueryClient {
  const aoErro = (erro: unknown) => {
    if (erro instanceof ErroApi && erro.status === 401) aoPerderSessao?.()
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: aoErro }),
    mutationCache: new MutationCache({ onError: aoErro }),
    defaultOptions: { queries: { retry: deveRepetir, staleTime: 5_000 } },
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

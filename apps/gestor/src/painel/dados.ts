import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '../api'
import { exigir } from '../erros'
import type { Periodo } from './formatos'

/**
 * Começa com 'acionamentos': as mutações (criar, revisar) invalidam esse prefixo, e o Painel se
 * atualiza junto com a lista, a contagem e o detalhe.
 */
export const chavePainel = (periodo: Periodo) => ['acionamentos', 'painel', periodo] as const

export function usarPainel(periodo: MaybeRefOrGetter<Periodo>) {
  return useQuery({
    queryKey: computed(() => chavePainel(toValue(periodo))),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        api.GET('/api/painel', {
          params: { query: { periodo: queryKey[2] === 30 ? '30' : '7' } },
          signal,
        }),
      ),
    // Ao trocar o período, os números anteriores ficam até os novos chegarem (sem zeros falsos).
    placeholderData: keepPreviousData,
  })
}

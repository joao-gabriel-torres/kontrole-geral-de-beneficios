import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '../../api'
import { CHAVES, comLimite } from '../../consultas'
import { exigir } from '../../erros'

/** Assinantes ativos cujo nome contém a busca (a API devolve no máximo 8, por nome). */
export function usarAssinantes(busca: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ['assinantes', toValue(busca).trim()] as const),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        comLimite(
          (s) =>
            api.GET('/api/assinantes', {
              params: { query: { busca: queryKey[1] || undefined } },
              signal: s,
            }),
          signal,
        ),
      ),
    // Enquanto a próxima busca não chega, a lista mostra a anterior em vez de piscar vazia.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Rua, bairro e cidade de um CEP (ViaCEP pela API). Só consulta com os 8 dígitos. */
export function usarEnderecoDoCep(cep: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ['cep', toValue(cep)] as const),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        comLimite(
          (s) => api.GET('/api/cep/{cep}', { params: { path: { cep: queryKey[1] } }, signal: s }),
          signal,
        ),
      ),
    enabled: computed(() => toValue(cep).length === 8),
    staleTime: Infinity,
  })
}

/**
 * Prestadores ativos; com um CEP, do mais próximo ao mais distante. A resposta leva o CEP da
 * consulta: o modal só escolhe o mais próximo com a lista daquele CEP. A chave começa com
 * ['prestadores', 'ativos'], invalidada pelas mudanças no cadastro.
 */
export function usarPrestadoresProximos(cep: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => [...CHAVES.prestadoresAtivos, toValue(cep)] as const),
    queryFn: async ({ queryKey, signal }) => ({
      cep: queryKey[2],
      lista: await exigir(
        comLimite(
          (s) =>
            api.GET('/api/prestadores', {
              params: { query: { status: 'ativo', cep: queryKey[2] || undefined } },
              signal: s,
            }),
          signal,
        ),
      ),
    }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

import type { components } from '@kgb/api-client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '../api'
import { CHAVES, comLimite } from '../consultas'
import { exigir } from '../erros'
import { statusDaConsulta, type FiltroLista } from './filtros'

export type NovoAcionamento = components['schemas']['NovoAcionamento']
export type NovaRevisao = components['schemas']['NovaRevisao']

export function usarContagem() {
  return useQuery({
    queryKey: CHAVES.contagem,
    queryFn: ({ signal }) =>
      exigir(comLimite((s) => api.GET('/api/acionamentos/contagem', { signal: s }), signal)),
  })
}

export function usarLista(
  filtro: MaybeRefOrGetter<FiltroLista>,
  busca: MaybeRefOrGetter<string> = '',
) {
  return useQuery({
    queryKey: computed(() => CHAVES.lista(toValue(filtro), toValue(busca))),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        comLimite(
          (s) =>
            api.GET('/api/acionamentos', {
              params: {
                query: { status: statusDaConsulta(queryKey[2]), busca: queryKey[3] || undefined },
              },
              signal: s,
            }),
          signal,
        ),
      ),
    placeholderData: keepPreviousData,
    // Voltar do Detalhe restaura a rolagem da lista: o cache vive 30 min sem observadores para a
    // página não voltar vazia (com o padrão de 5 min, uma leitura longa do Detalhe a coletaria).
    gcTime: 30 * 60_000,
  })
}

export function usarDetalhe(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => CHAVES.detalhe(toValue(id))),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        comLimite(
          (s) =>
            api.GET('/api/acionamentos/{id}', { params: { path: { id: queryKey[2] } }, signal: s }),
          signal,
        ),
      ),
  })
}

export function usarTipos() {
  return useQuery({
    queryKey: CHAVES.tipos,
    queryFn: ({ signal }) => exigir(comLimite((s) => api.GET('/api/tipos', { signal: s }), signal)),
    staleTime: 60_000,
  })
}

export function usarPrestadoresAtivos() {
  return useQuery({
    queryKey: CHAVES.prestadoresAtivos,
    queryFn: ({ signal }) =>
      exigir(
        comLimite(
          (s) => api.GET('/api/prestadores', { params: { query: { status: 'ativo' } }, signal: s }),
          signal,
        ),
      ),
    staleTime: 60_000,
  })
}

export function usarCriarAcionamento() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (corpo: NovoAcionamento) =>
      exigir(comLimite((s) => api.POST('/api/acionamentos', { body: corpo, signal: s }))),
    // Também no erro: com o tempo esgotado a API pode ter gravado, e a lista precisa mostrar o
    // acionamento criado antes de a gestora tentar de novo.
    onSettled: () => {
      void consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    },
  })
}

export function usarRevisao(id: MaybeRefOrGetter<string>) {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (corpo: NovaRevisao) =>
      exigir(
        comLimite((s) =>
          api.POST('/api/acionamentos/{id}/revisao', {
            params: { path: { id: toValue(id) } },
            body: corpo,
            signal: s,
          }),
        ),
      ),
    onSuccess: (detalhe) => {
      consultas.setQueryData(CHAVES.detalhe(detalhe.id), detalhe)
    },
    // Com sucesso ou erro (ex.: 409, outra pessoa já decidiu), tudo volta a refletir a API.
    onSettled: () => {
      void consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    },
  })
}

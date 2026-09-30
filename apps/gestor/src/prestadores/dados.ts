import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '../api'
import { exigir } from '../erros'
import type { DadosPrestador } from './formulario'
import type { PrestadorCadastro } from './lista'

export type StatusPrestador = PrestadorCadastro['status']

/**
 * Chaves do cadastro. As mutações invalidam o prefixo 'prestadores', que também atualiza o seletor
 * do Novo acionamento (['prestadores', 'ativos']).
 */
export const CHAVES_PRESTADORES = {
  todos: ['prestadores'] as const,
  cadastro: ['prestadores', 'cadastro'] as const,
}

export function usarCadastro() {
  return useQuery({
    queryKey: CHAVES_PRESTADORES.cadastro,
    queryFn: ({ signal }) => exigir(api.GET('/api/prestadores/cadastro', { signal })),
    placeholderData: keepPreviousData,
  })
}

function usarInvalidar() {
  const consultas = useQueryClient()
  return () => consultas.invalidateQueries({ queryKey: CHAVES_PRESTADORES.todos })
}

/** Novo (sem id: POST) ou Editar (com id: PATCH). */
export function usarSalvarPrestador() {
  const invalidar = usarInvalidar()
  return useMutation({
    mutationFn: ({ id, corpo }: { id: string | null; corpo: DadosPrestador }) =>
      exigir(
        id
          ? api.PATCH('/api/prestadores/{id}', { params: { path: { id } }, body: corpo })
          : api.POST('/api/prestadores', { body: corpo }),
      ),
    onSuccess: () => void invalidar(),
  })
}

/** O switch da lista e o "Desativar": a lista muda na hora e volta se a API recusar. */
export function usarAlterarStatus() {
  const consultas = useQueryClient()
  const invalidar = usarInvalidar()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPrestador }) =>
      exigir(
        api.PATCH('/api/prestadores/{id}/status', {
          params: { path: { id } },
          body: { status },
        }),
      ),
    onMutate: async ({ id, status }) => {
      await consultas.cancelQueries({ queryKey: CHAVES_PRESTADORES.cadastro })
      const antes = consultas.getQueryData<PrestadorCadastro[]>(CHAVES_PRESTADORES.cadastro)
      if (antes) {
        consultas.setQueryData(
          CHAVES_PRESTADORES.cadastro,
          antes.map((p) => (p.id === id ? { ...p, status } : p)),
        )
      }
      return { antes }
    },
    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.antes) consultas.setQueryData(CHAVES_PRESTADORES.cadastro, contexto.antes)
    },
    onSettled: () => invalidar(),
  })
}

/** Envia (ou reenvia) o convite de acesso ao app para o e-mail salvo no cadastro. */
export function usarEnviarConvite() {
  const invalidar = usarInvalidar()
  return useMutation({
    mutationFn: (id: string) =>
      exigir(api.POST('/api/prestadores/{id}/convite', { params: { path: { id } } })),
    onSuccess: () => void invalidar(),
  })
}

export function usarExcluirPrestador() {
  const invalidar = usarInvalidar()
  return useMutation({
    mutationFn: (id: string) =>
      exigir(api.DELETE('/api/prestadores/{id}', { params: { path: { id } } })),
    // Com sucesso ou com o 409 de uma corrida, a lista volta a refletir a API.
    onSettled: () => invalidar(),
  })
}

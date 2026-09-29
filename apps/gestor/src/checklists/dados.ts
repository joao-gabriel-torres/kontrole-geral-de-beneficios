import type { components, TipoDemanda } from '@kgb/api-client'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { exigir } from '../erros'

export type AtualizacaoTipo = components['schemas']['AtualizacaoTipo']

/** O cadastro de prestadores mostra os nomes dos tipos (especialidades) e perde os excluídos. */
const PRESTADORES = ['prestadores'] as const

function mudarNoCache(
  consultas: QueryClient,
  mudar: (lista: TipoDemanda[]) => TipoDemanda[],
): void {
  consultas.setQueryData<TipoDemanda[]>(CHAVES.tipos, (lista) => lista && mudar(lista))
}

/** Os tipos da tela, na mesma consulta do Novo acionamento (a lista dele acompanha). */
export function usarTiposDemanda() {
  return useQuery({
    queryKey: CHAVES.tipos,
    queryFn: ({ signal }) => exigir(api.GET('/api/tipos', { signal })),
  })
}

/**
 * Salva o nome e/ou o checklist de um tipo. Na resposta, só o campo enviado entra no cache: os
 * envios do nome e do checklist correm em filas separadas, e um não desfaz o outro.
 */
export function usarSalvarTipo(): (id: string, corpo: AtualizacaoTipo) => Promise<TipoDemanda> {
  const consultas = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationFn: ({ id, corpo }: { id: string; corpo: AtualizacaoTipo }) =>
      exigir(api.PATCH('/api/tipos/{id}', { params: { path: { id } }, body: corpo })),
    onSuccess: (salvo, { corpo }) => {
      mudarNoCache(consultas, (lista) =>
        lista.map((t) =>
          t.id !== salvo.id
            ? t
            : {
                ...t,
                ...(corpo.nome !== undefined ? { nome: salvo.nome } : {}),
                ...(corpo.checklist !== undefined ? { checklist: salvo.checklist } : {}),
              },
        ),
      )
      if (corpo.nome !== undefined) void consultas.invalidateQueries({ queryKey: PRESTADORES })
    },
  })
  return (id, corpo) => mutateAsync({ id, corpo })
}

export function usarCriarTipo() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (nome: string) => exigir(api.POST('/api/tipos', { body: { nome } })),
    onSuccess: (tipo) => mudarNoCache(consultas, (lista) => [...lista, tipo]),
  })
}

export function usarExcluirTipo() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => exigir(api.DELETE('/api/tipos/{id}', { params: { path: { id } } })),
    onSuccess: (_, id) => {
      mudarNoCache(consultas, (lista) => lista.filter((t) => t.id !== id))
      void consultas.invalidateQueries({ queryKey: PRESTADORES })
    },
  })
}

import { useQuery } from '@tanstack/vue-query'
import { api } from '../api'
import { CHAVES, exigir } from '../consultas'

/** Todos os acionamentos do prestador (a API só devolve os dele); os filtros são locais. */
export function usarDemandas() {
  return useQuery({
    queryKey: CHAVES.lista,
    queryFn: async () => exigir(await api.GET('/api/acionamentos')),
  })
}

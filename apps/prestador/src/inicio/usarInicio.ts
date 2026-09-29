import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { api } from '../api'
import { CHAVES, exigir } from '../consultas'

export function usarInicio() {
  const consulta = useQuery({
    queryKey: CHAVES.inicio,
    queryFn: async () => exigir(await api.GET('/api/prestador/inicio')),
  })
  const proximo = computed(() => consulta.data.value?.proximo ?? null)
  return { ...consulta, proximo }
}

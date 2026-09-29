import type { ResumoAcionamento } from '@kgb/api-client'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { api } from '../api'
import { CHAVES, exigir } from '../consultas'

export function usarInicio() {
  const consulta = useQuery({
    queryKey: CHAVES.inicio,
    queryFn: async () => exigir(await api.GET('/api/prestador/inicio')),
  })
  // O gerador de tipos transforma o `nullable` de `proximo` numa interseção estranha.
  const proximo = computed(() => (consulta.data.value?.proximo ?? null) as ResumoAcionamento | null)
  return { ...consulta, proximo }
}

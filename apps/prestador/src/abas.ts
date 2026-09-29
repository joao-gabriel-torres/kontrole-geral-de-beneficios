import type { NomeIcone } from '@kgb/ui'

export interface Aba {
  rota: 'inicio' | 'agenda' | 'demandas'
  rotulo: string
  icone: NomeIcone
}

export const ABAS: readonly Aba[] = [
  { rota: 'inicio', rotulo: 'Início', icone: 'dashboard' },
  { rota: 'agenda', rotulo: 'Agenda', icone: 'date-time' },
  { rota: 'demandas', rotulo: 'Demandas', icone: 'check-done' },
]

import type { NomeIcone } from '@kgb/ui'

export type RotaGestor = 'painel' | 'acionamentos' | 'aprovacoes' | 'prestadores' | 'checklists'

export interface ItemNavegacao {
  rota: RotaGestor
  rotulo: string
  icone: NomeIcone
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { rota: 'painel', rotulo: 'Painel', icone: 'dashboard' },
  { rota: 'acionamentos', rotulo: 'Acionamentos', icone: 'description' },
  { rota: 'aprovacoes', rotulo: 'Aprovações', icone: 'check-done' },
  { rota: 'prestadores', rotulo: 'Prestadores', icone: 'member' },
  { rota: 'checklists', rotulo: 'Checklists', icone: 'settings' },
]

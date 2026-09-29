import { CASOS_AGENDA } from './casos-agenda'
import { CASOS_CHECKLISTS } from './casos-checklists'
import { CASOS_GESTOR } from './casos-gestor'
import { CASOS_PAINEL } from './casos-painel'
import { CASOS_PRESTADOR } from './casos-prestador'
import { CASOS_PRESTADORES } from './casos-prestadores'

export * from './tipos'

/**
 * Em ordem segura: os casos só de leitura primeiro; os do prestador por último, porque o último
 * deles ("Iniciar atendimento") grava no banco.
 */
export const CASOS = [
  ...CASOS_PAINEL,
  ...CASOS_GESTOR,
  ...CASOS_CHECKLISTS,
  ...CASOS_PRESTADORES,
  ...CASOS_AGENDA,
  ...CASOS_PRESTADOR,
]

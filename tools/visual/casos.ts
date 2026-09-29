import { CASOS_GESTOR } from './casos-gestor'
import { CASOS_PRESTADOR } from './casos-prestador'

export * from './tipos'
export const CASOS = [...CASOS_GESTOR, ...CASOS_PRESTADOR]

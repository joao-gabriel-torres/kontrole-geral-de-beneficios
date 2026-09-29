import { abasPrestador, cabecalhoPrestador } from './regioes'
import type { Caso } from './tipos'

/** Agenda do prestador. Roda antes dos casos do prestador que gravam no banco. */
export const CASOS_AGENDA: Caso[] = [
  {
    nome: 'prestador-agenda',
    modo: 'pa',
    navegarPrototipo: 'Agenda',
    app: 'prestador',
    rota: '/agenda',
    regioes: [abasPrestador, cabecalhoPrestador(48)],
  },
]

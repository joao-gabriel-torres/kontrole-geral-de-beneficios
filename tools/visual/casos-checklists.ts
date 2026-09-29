import { cabecalhoWeb, sidebar } from './regioes'
import type { Caso } from './tipos'

/** Checklists (tipos de demanda). Só estados que não gravam no banco. */
export const CASOS_CHECKLISTS: Caso[] = [
  {
    nome: 'gestor-web-checklists',
    modo: 'gw',
    navegarPrototipo: 'Checklists',
    app: 'gestor',
    rota: '/checklists',
    regioes: [sidebar, cabecalhoWeb(56)],
  },
]

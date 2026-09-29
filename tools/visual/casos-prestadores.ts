import { sidebar } from './regioes'
import type { Caso } from './tipos'

/**
 * Prestadores (cadastro e planilha). Só estados que não gravam no banco: salvar, o switch, excluir
 * e importar mudariam os dados dos casos seguintes.
 */
export const CASOS_PRESTADORES: Caso[] = [
  {
    nome: 'gestor-web-prestadores',
    modo: 'gw',
    navegarPrototipo: 'Prestadores',
    app: 'gestor',
    rota: '/prestadores',
    regioes: [sidebar],
  },
]

import { abasGestor, cabecalhoWeb, sidebar } from './regioes'
import type { Caso } from './tipos'

/** Painel do gestor. Casos só de leitura: rodam antes dos que gravam no banco. */
export const CASOS_PAINEL: Caso[] = [
  {
    nome: 'gestor-web-painel',
    modo: 'gw',
    app: 'gestor',
    rota: '/painel',
    regioes: [sidebar, cabecalhoWeb(56)],
  },
  {
    nome: 'gestor-mobile-painel',
    modo: 'gm',
    app: 'gestor',
    rota: '/painel',
    regioes: [abasGestor, { nome: 'cabecalho', x: 16, y: 16, largura: 300, altura: 52 }],
  },
]

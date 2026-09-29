export type Modo = 'gw' | 'gm' | 'pa'

export interface Regiao {
  nome: string
  x: number
  y: number
  largura: number
  altura: number
}

export interface Caso {
  nome: string
  modo: Modo
  /** Texto do botão de navegação que leva à tela no protótipo (vazio = tela inicial). */
  navegarPrototipo?: string
  app: 'gestor' | 'prestador'
  rota: string
  regioes: Regiao[]
}

/** Área útil do app, igual à área do protótipo sem a barra do topo e sem a barra de status falsa. */
export const VIEWPORT_APP: Record<Modo, { width: number; height: number }> = {
  gw: { width: 1440, height: 844 },
  gm: { width: 375, height: 768 },
  pa: { width: 375, height: 768 },
}

const sidebar: Regiao = { nome: 'sidebar', x: 0, y: 0, largura: 232, altura: 844 }
const abasGestor: Regiao = { nome: 'abas', x: 0, y: 692, largura: 375, altura: 76 }
const abasPrestador: Regiao = { nome: 'abas', x: 0, y: 688, largura: 375, altura: 80 }
const cabecalhoWeb = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 264,
  y: 28,
  largura: 480,
  altura,
})
const cabecalhoPrestador = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 0,
  y: 0,
  largura: 360,
  altura,
})

export const CASOS: Caso[] = [
  {
    nome: 'gestor-web-painel',
    modo: 'gw',
    app: 'gestor',
    rota: '/painel',
    regioes: [sidebar, cabecalhoWeb(56)],
  },
  {
    nome: 'gestor-web-acionamentos',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    regioes: [sidebar, cabecalhoWeb(44)],
  },
  {
    nome: 'gestor-web-aprovacoes',
    modo: 'gw',
    navegarPrototipo: 'Aprovações',
    app: 'gestor',
    rota: '/aprovacoes',
    regioes: [sidebar, cabecalhoWeb(56)],
  },
  // O subtítulo "N ativos de M" depende de dados de prestadores: o cabeçalho entra quando a tela for implementada.
  {
    nome: 'gestor-web-prestadores',
    modo: 'gw',
    navegarPrototipo: 'Prestadores',
    app: 'gestor',
    rota: '/prestadores',
    regioes: [sidebar],
  },
  {
    nome: 'gestor-web-checklists',
    modo: 'gw',
    navegarPrototipo: 'Checklists',
    app: 'gestor',
    rota: '/checklists',
    regioes: [sidebar, cabecalhoWeb(56)],
  },
  {
    nome: 'gestor-mobile-painel',
    modo: 'gm',
    app: 'gestor',
    rota: '/painel',
    regioes: [abasGestor, { nome: 'cabecalho', x: 16, y: 16, largura: 300, altura: 52 }],
  },
  {
    nome: 'gestor-mobile-aprovacoes',
    modo: 'gm',
    navegarPrototipo: 'Aprovações',
    app: 'gestor',
    rota: '/aprovacoes',
    regioes: [abasGestor],
  },
  {
    nome: 'prestador-inicio',
    modo: 'pa',
    app: 'prestador',
    rota: '/inicio',
    regioes: [abasPrestador, cabecalhoPrestador(64)],
  },
  {
    nome: 'prestador-agenda',
    modo: 'pa',
    navegarPrototipo: 'Agenda',
    app: 'prestador',
    rota: '/agenda',
    regioes: [abasPrestador, cabecalhoPrestador(48)],
  },
  {
    nome: 'prestador-demandas',
    modo: 'pa',
    navegarPrototipo: 'Demandas',
    app: 'prestador',
    rota: '/demandas',
    regioes: [abasPrestador, cabecalhoPrestador(48)],
  },
]

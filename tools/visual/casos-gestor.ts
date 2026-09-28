import { telaInteira, type Caso, type Regiao } from './tipos'

const sidebar: Regiao = { nome: 'sidebar', x: 0, y: 0, largura: 232, altura: 844 }
const abasGestor: Regiao = { nome: 'abas', x: 0, y: 692, largura: 375, altura: 76 }
const cabecalhoWeb = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 264,
  y: 28,
  largura: 480,
  altura,
})
const telaWeb = telaInteira('gw')
const telaMobile = telaInteira('gm')

export const CASOS_GESTOR: Caso[] = [
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
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-web-acionamentos-aguardando',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando 3' }],
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-web-aprovacoes',
    modo: 'gw',
    navegarPrototipo: 'Aprovações',
    app: 'gestor',
    rota: '/aprovacoes',
    regioes: [telaWeb],
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
    regioes: [telaMobile],
  },
  {
    nome: 'gestor-mobile-acionamentos',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    regioes: [telaMobile],
  },
  {
    nome: 'gestor-mobile-acionamentos-aguardando',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando 3' }],
    regioes: [telaMobile],
  },
]

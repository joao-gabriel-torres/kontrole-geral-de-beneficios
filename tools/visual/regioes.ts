import { telaInteira, type Regiao } from './tipos'

/** Regiões comuns aos casos de cada app (coordenadas da área útil do app). */
export const sidebar: Regiao = { nome: 'sidebar', x: 0, y: 0, largura: 232, altura: 844 }
export const abasGestor: Regiao = { nome: 'abas', x: 0, y: 692, largura: 375, altura: 76 }
export const cabecalhoWeb = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 264,
  y: 28,
  largura: 480,
  altura,
})
export const telaWeb = telaInteira('gw')
export const telaMobile = telaInteira('gm')

export const abasPrestador: Regiao = { nome: 'abas', x: 0, y: 688, largura: 375, altura: 80 }
export const cabecalhoPrestador = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 0,
  y: 0,
  largura: 360,
  altura,
})
export const telaPrestador = telaInteira('pa')

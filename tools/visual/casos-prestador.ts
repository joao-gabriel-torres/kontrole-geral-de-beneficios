import type { Caso, Regiao } from './tipos'

const abasPrestador: Regiao = { nome: 'abas', x: 0, y: 688, largura: 375, altura: 80 }
const cabecalhoPrestador = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 0,
  y: 0,
  largura: 360,
  altura,
})

export const CASOS_PRESTADOR: Caso[] = [
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

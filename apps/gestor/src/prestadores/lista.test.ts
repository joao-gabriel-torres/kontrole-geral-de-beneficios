import { describe, expect, it } from 'vitest'
import {
  chipsDaLinha,
  contagens,
  filtrarPrestadores,
  FILTROS,
  linhaDocumento,
  rotuloCarga,
  subtitulo,
} from './lista'
import { prestador, SEED_PRESTADORES } from './teste/dados'

const nomes = (lista: { nome: string }[]) => lista.map((p) => p.nome)

describe('subtitulo', () => {
  it('"{A} ativos de {M} credenciados", com os não excluídos', () => {
    expect(subtitulo(SEED_PRESTADORES)).toBe('5 ativos de 6 credenciados')
  })
  it('singular com 1 (decisão do spec)', () => {
    expect(subtitulo([prestador()])).toBe('1 ativo de 1 credenciado')
    expect(subtitulo([prestador({ status: 'inativo' })])).toBe('0 ativos de 1 credenciado')
    expect(subtitulo([])).toBe('0 ativos de 0 credenciados')
  })
})

describe('filtros', () => {
  it('Todos, Ativos e Inativos, nessa ordem', () => {
    expect(FILTROS.map((f) => f.rotulo)).toEqual(['Todos', 'Ativos', 'Inativos'])
  })
  it('contagens sobre todos, sem a busca', () => {
    expect(contagens(SEED_PRESTADORES)).toEqual({ todos: 6, ativo: 5, inativo: 1 })
  })
  it('filtra por status mantendo a ordem da API', () => {
    expect(nomes(filtrarPrestadores(SEED_PRESTADORES, 'inativo', ''))).toEqual(['Roberto Alves'])
    expect(filtrarPrestadores(SEED_PRESTADORES, 'ativo', '')).toHaveLength(5)
    expect(nomes(filtrarPrestadores(SEED_PRESTADORES, 'todos', ''))).toEqual(
      nomes(SEED_PRESTADORES),
    )
  })
})

describe('busca', () => {
  const buscar = (termo: string, filtro: 'todos' | 'ativo' | 'inativo' = 'todos') =>
    nomes(filtrarPrestadores(SEED_PRESTADORES, filtro, termo))

  it('por nome, ignorando maiúsculas e acentos', () => {
    expect(buscar('JOAO P')).toEqual(['João Pires'])
    expect(buscar('  luciana ')).toEqual(['Luciana Prado'])
  })
  it('por documento formatado ou só com dígitos', () => {
    expect(buscar('318.402')).toEqual(['Carlos Mendes'])
    expect(buscar('318402')).toEqual(['Carlos Mendes'])
    expect(buscar('27.415.903/0001')).toEqual(['Ana Ribeiro'])
  })
  it('por região e e-mail', () => {
    expect(buscar('zona oeste')).toEqual(['Carlos Mendes', 'Marina Costa'])
    expect(buscar('marinacosta.com')).toEqual(['Marina Costa'])
  })
  it('os campos seguidos, como no protótipo ("mendes318")', () => {
    expect(buscar('mendes318')).toEqual(['Carlos Mendes'])
  })
  it('combina com o filtro', () => {
    expect(buscar('zona', 'inativo')).toEqual(['Roberto Alves'])
  })
  it('sem resultado', () => {
    expect(buscar('xyz')).toEqual([])
  })
  it('região e e-mail vazios não quebram a busca', () => {
    const semDados = prestador({ nome: 'Sem Dados', email: null, regiao: null })
    expect(nomes(filtrarPrestadores([semDados], 'todos', 'sem'))).toEqual(['Sem Dados'])
  })
})

describe('linha', () => {
  it('documento formatado e região (vazia vira "—")', () => {
    expect(linhaDocumento(prestador())).toBe('318.402.117-50 · Zona Oeste')
    expect(linhaDocumento(prestador({ documento: '27415903000144', regiao: null }))).toBe(
      '27.415.903/0001-44 · —',
    )
  })
  it('até 2 chips de especialidade e "+n"', () => {
    expect(chipsDaLinha(prestador())).toEqual({
      visiveis: ['Vazamento', 'Revisão elétrica'],
      mais: '+2',
    })
    const luciana = SEED_PRESTADORES.find((p) => p.id === 'p6')!
    expect(chipsDaLinha(luciana)).toEqual({ visiveis: ['Reparo em gesso', 'Pintura'], mais: null })
    expect(chipsDaLinha(prestador({ especialidades: [] }))).toEqual({ visiveis: [], mais: null })
  })
  it('carga "X em aberto · Y no total"', () => {
    expect(rotuloCarga(prestador())).toBe('8 em aberto · 20 no total')
  })
})

import { describe, expect, it } from 'vitest'
import { TIPOS } from '../../test/fixtures'
import { alternarTipo, gruposDeTipos, tipoDoEnter } from './buscaTipos'

describe('busca de tipos', () => {
  it('liga e desliga um tipo, guardando a ordem de escolha', () => {
    expect(alternarTipo(['t1'], 't6')).toEqual(['t1', 't6'])
    expect(alternarTipo(['t1', 't6'], 't1')).toEqual(['t6'])
  })

  const nomes = (grupos: ReturnType<typeof gruposDeTipos>) =>
    grupos.map((g) => [g.categoria, g.tipos.map((t) => t.nome)])

  it('agrupa por categoria em ordem alfabética, com "Outros" (sem categoria) no fim', () => {
    expect(nomes(gruposDeTipos(TIPOS, ''))).toEqual([
      ['Acabamento', ['Reparo em gesso']],
      ['Elétrica', ['Revisão elétrica']],
      ['Hidráulica', ['Vazamento']],
      ['Outros', ['Vistoria']],
    ])
  })

  it('filtra pelo nome do tipo, sem acentos e sem maiúsculas', () => {
    expect(nomes(gruposDeTipos(TIPOS, '  ELETRICA '))).toEqual([['Elétrica', ['Revisão elétrica']]])
    expect(nomes(gruposDeTipos(TIPOS, 'gesso'))).toEqual([['Acabamento', ['Reparo em gesso']]])
  })

  it('filtra pelo nome da categoria (inclusive "Outros")', () => {
    expect(nomes(gruposDeTipos(TIPOS, 'hidraul'))).toEqual([['Hidráulica', ['Vazamento']]])
    expect(nomes(gruposDeTipos(TIPOS, 'outros'))).toEqual([['Outros', ['Vistoria']]])
  })

  it('sem resultado, nenhum grupo', () => {
    expect(gruposDeTipos(TIPOS, 'jardinagem')).toEqual([])
  })

  it('o Enter liga o primeiro que casa pelo nome; sem nenhum, o primeiro pela categoria', () => {
    const tipos = [...TIPOS, { ...TIPOS[1]!, id: 't3', nome: 'Ponto de luz' }]
    const doEnter = (busca: string) => tipoDoEnter(gruposDeTipos(tipos, busca), busca)?.nome
    expect(doEnter('eletr')).toBe('Revisão elétrica')
    expect(doEnter('ELÉTRICA')).toBe('Revisão elétrica')
    expect(doEnter('hidraul')).toBe('Vazamento')
    expect(doEnter('jardim')).toBeUndefined()
  })

  it('ordena os tipos pelo nome dentro da categoria', () => {
    const eletricos = [
      { ...TIPOS[1]!, id: 'x1', nome: 'Troca de disjuntor' },
      { ...TIPOS[1]!, id: 'x2', nome: 'Ponto de luz' },
      TIPOS[1]!,
    ]
    expect(nomes(gruposDeTipos(eletricos, ''))).toEqual([
      ['Elétrica', ['Ponto de luz', 'Revisão elétrica', 'Troca de disjuntor']],
    ])
  })
})

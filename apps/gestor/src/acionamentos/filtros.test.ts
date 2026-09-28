import { describe, expect, it } from 'vitest'
import { contagem } from '../../test/fixtures'
import { contagemDoFiltro, FILTROS, statusDaConsulta } from './filtros'

describe('filtros da lista', () => {
  it('seguem a ordem e os rótulos do protótipo', () => {
    expect(FILTROS.map((f) => f.rotulo)).toEqual([
      'Todos',
      'Agendados',
      'Em execução',
      'Aguardando',
      'Reprovados',
      'Finalizados',
    ])
  })
  it('contam cada status; Todos soma tudo e Finalizados são os aprovados', () => {
    const c = contagem()
    expect(FILTROS.map((f) => contagemDoFiltro(c, f.id))).toEqual([70, 7, 1, 3, 2, 57])
  })
  it('sem contagem carregada, não mostram número', () => {
    expect(contagemDoFiltro(undefined, 'todos')).toBeNull()
  })
  it('viram o status da consulta (Todos não filtra)', () => {
    expect(statusDaConsulta('todos')).toBeUndefined()
    expect(statusDaConsulta('finalizados')).toBe('finalizados')
    expect(statusDaConsulta('em_andamento')).toBe('em_andamento')
  })
})

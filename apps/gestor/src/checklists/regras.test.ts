import { describe, expect, it } from 'vitest'
import {
  acrescentarEtapa,
  editarEtapa,
  escolherSelecionado,
  removerEtapa,
  rotuloItens,
  subirEtapa,
  descerEtapa,
  moverEtapa,
} from './regras'

describe('rotuloItens', () => {
  it('corrige o singular do protótipo ("1 itens")', () => {
    expect(rotuloItens(0)).toBe('0 itens')
    expect(rotuloItens(1)).toBe('1 item')
    expect(rotuloItens(5)).toBe('5 itens')
  })
})

describe('etapas', () => {
  const lista = ['a', 'b', 'c']

  it('editar troca só o texto da posição, sem trim', () => {
    expect(editarEtapa(lista, 1, 'b ')).toEqual(['a', 'b ', 'c'])
  })

  it('subir troca com a anterior; na primeira não faz nada', () => {
    expect(subirEtapa(lista, 2)).toEqual(['a', 'c', 'b'])
    expect(subirEtapa(lista, 0)).toBeNull()
  })

  it('descer troca com a seguinte; na última não faz nada', () => {
    expect(descerEtapa(lista, 0)).toEqual(['b', 'a', 'c'])
    expect(descerEtapa(lista, 2)).toBeNull()
  })

  it('mover leva a etapa de uma posição a outra (arrastar), empurrando as do meio', () => {
    expect(moverEtapa(lista, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moverEtapa(lista, 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moverEtapa(lista, 1, 1)).toBeNull()
    expect(moverEtapa(lista, 0, 3)).toBeNull()
    expect(moverEtapa(lista, -1, 0)).toBeNull()
  })

  it('remover tira a posição', () => {
    expect(removerEtapa(lista, 0)).toEqual(['b', 'c'])
  })

  it('acrescentar faz trim, entra no fim e recusa texto vazio', () => {
    expect(acrescentarEtapa(lista, '  d  ')).toEqual(['a', 'b', 'c', 'd'])
    expect(acrescentarEtapa(lista, '   ')).toBeNull()
  })

  it('nenhuma operação muda a lista recebida', () => {
    subirEtapa(lista, 1)
    descerEtapa(lista, 1)
    moverEtapa(lista, 0, 2)
    removerEtapa(lista, 1)
    editarEtapa(lista, 1, 'x')
    acrescentarEtapa(lista, 'y')
    expect(lista).toEqual(['a', 'b', 'c'])
  })
})

describe('escolherSelecionado', () => {
  const tipos = [{ id: 't1' }, { id: 't2' }]

  it('o do id; se ele não existir (ou for null), o primeiro; sem tipos, nenhum', () => {
    expect(escolherSelecionado(tipos, 't2')).toEqual({ id: 't2' })
    expect(escolherSelecionado(tipos, 'sumiu')).toEqual({ id: 't1' })
    expect(escolherSelecionado(tipos, null)).toEqual({ id: 't1' })
    expect(escolherSelecionado([], null)).toBeNull()
  })
})

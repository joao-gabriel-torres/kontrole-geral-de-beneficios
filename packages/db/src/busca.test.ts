import { describe, expect, it } from 'vitest'
import { nomeDeBusca } from './busca'

describe('nomeDeBusca', () => {
  it('tira os acentos do português e passa para minúsculas, sem mexer no resto', () => {
    expect(nomeDeBusca('Clínica Vida')).toBe('clinica vida')
    expect(nomeDeBusca('Escritório Nunes & Lima')).toBe('escritorio nunes & lima')
    expect(nomeDeBusca('Padaria Pão Dourado')).toBe('padaria pao dourado')
    expect(nomeDeBusca('  Hotel Ipê ')).toBe('  hotel ipe ')
  })

  it('cobre todas as vogais acentuadas, o ç e o ñ, maiúsculas e minúsculas', () => {
    expect(nomeDeBusca('ÁÀÂÃÄ ÉÈÊË ÍÌÎÏ ÓÒÔÕÖ ÚÙÛÜ Ç Ñ')).toBe('aaaaa eeee iiii ooooo uuuu c n')
    expect(nomeDeBusca('áàâãä éèêë íìîï óòôõö úùûü ç ñ')).toBe('aaaaa eeee iiii ooooo uuuu c n')
  })

  it('acento decomposto (NFD) vira o mesmo que o composto', () => {
    expect(nomeDeBusca('Clínica'.normalize('NFD'))).toBe('clinica')
  })
})

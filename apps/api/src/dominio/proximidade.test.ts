import { describe, expect, it } from 'vitest'
import { distanciaEntreCeps, ordenarPorProximidade } from './proximidade'

describe('distanciaEntreCeps', () => {
  it('é a diferença absoluta entre os números dos CEPs', () => {
    expect(distanciaEntreCeps('01304001', '05422001')).toBe(4118000)
    expect(distanciaEntreCeps('05422001', '01304001')).toBe(4118000)
    expect(distanciaEntreCeps('01304001', '01304001')).toBe(0)
  })
})

describe('ordenarPorProximidade', () => {
  const lista = [
    { nome: 'Bruno', cep: '05018000' },
    { nome: 'Ana', cep: null },
    { nome: 'Zeca', cep: '01001000' },
    { nome: 'Caio', cep: '05020000' },
    { nome: 'Wagner', cep: '05018000' },
  ]

  it('põe o mais próximo primeiro e desempata pelo nome', () => {
    expect(ordenarPorProximidade(lista, '05017000').map((p) => p.nome)).toEqual([
      'Bruno', // 1000
      'Wagner', // 1000, empate resolvido pelo nome
      'Caio', // 3000
      'Zeca', // 4016000
      'Ana', // sem CEP: vai ao fim
    ])
  })

  it('quem não tem CEP fica no fim, em ordem de nome', () => {
    const semCep = [
      { nome: 'Zilda', cep: null },
      { nome: 'Alberto', cep: null },
      { nome: 'Meio', cep: '01001000' },
    ]
    expect(ordenarPorProximidade(semCep, '01001000').map((p) => p.nome)).toEqual([
      'Meio',
      'Alberto',
      'Zilda',
    ])
  })

  it('não muda a lista original', () => {
    const copia = [...lista]
    ordenarPorProximidade(lista, '05017000')
    expect(lista).toEqual(copia)
  })
})

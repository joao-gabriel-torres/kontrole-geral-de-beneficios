import { describe, expect, it } from 'vitest'
import { dataCurtaPorExtenso, dataPorExtenso, iniciais, primeiroNome, saudacao } from './formatos'

describe('datas no fuso de São Paulo', () => {
  it('escreve a data por extenso como no painel do gestor', () => {
    expect(dataPorExtenso(new Date('2026-09-28T15:00:00Z'))).toBe('Segunda-feira, 28/09/2026')
  })
  it('usa o dia de São Paulo mesmo quando em UTC já é o dia seguinte', () => {
    expect(dataPorExtenso(new Date('2026-09-29T01:30:00Z'))).toBe('Segunda-feira, 28/09/2026')
  })
  it('escreve a data curta como no app do prestador', () => {
    expect(dataCurtaPorExtenso(new Date('2026-09-28T15:00:00Z'))).toBe('Segunda-feira, 28/09')
  })
})

describe('saudacao', () => {
  const as = (hora: string) => new Date(`2026-09-28T${hora}:00-03:00`)
  it.each([
    ['00:00', 'Bom dia'],
    ['11:59', 'Bom dia'],
    ['12:00', 'Boa tarde'],
    ['17:59', 'Boa tarde'],
    ['18:00', 'Boa noite'],
    ['23:59', 'Boa noite'],
  ])('às %s diz "%s"', (hora, esperado) => {
    expect(saudacao(as(hora))).toBe(esperado)
  })
})

describe('nomes', () => {
  it('pega as iniciais do primeiro e do último nome', () => {
    expect(iniciais('Renata Silva')).toBe('RS')
    expect(iniciais('  João  da Silva Pires ')).toBe('JP')
    expect(iniciais('Ana')).toBe('A')
  })
  it('pega o primeiro nome', () => {
    expect(primeiroNome('Carlos Mendes')).toBe('Carlos')
    expect(primeiroNome('')).toBe('')
  })
})

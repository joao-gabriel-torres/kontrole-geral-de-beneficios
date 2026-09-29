import { describe, expect, it } from 'vitest'
import { datasComAtendimento, doDia, faixaDeDias, naFaixa, rotuloDoDia, somarDias } from './dias'

describe('somarDias', () => {
  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-09-29', 0)).toBe('2026-09-29')
    expect(somarDias('2026-09-29', 2)).toBe('2026-10-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('faixaDeDias', () => {
  it('são 7 dias a partir de hoje, com o dia da semana curto e o número sem zero', () => {
    expect(faixaDeDias('2026-09-29')).toEqual([
      { data: '2026-09-29', diaSemana: 'Ter', numero: '29' },
      { data: '2026-09-30', diaSemana: 'Qua', numero: '30' },
      { data: '2026-10-01', diaSemana: 'Qui', numero: '1' },
      { data: '2026-10-02', diaSemana: 'Sex', numero: '2' },
      { data: '2026-10-03', diaSemana: 'Sáb', numero: '3' },
      { data: '2026-10-04', diaSemana: 'Dom', numero: '4' },
      { data: '2026-10-05', diaSemana: 'Seg', numero: '5' },
    ])
  })
})

describe('naFaixa', () => {
  it('vale de hoje até hoje + 6', () => {
    expect(naFaixa('2026-09-28', '2026-09-29')).toBe(false)
    expect(naFaixa('2026-09-29', '2026-09-29')).toBe(true)
    expect(naFaixa('2026-10-05', '2026-09-29')).toBe(true)
    expect(naFaixa('2026-10-06', '2026-09-29')).toBe(false)
  })
})

describe('rotuloDoDia', () => {
  it('"Hoje", "Amanhã" ou o nome completo do dia, com DD/MM', () => {
    expect(rotuloDoDia('2026-09-29', '2026-09-29')).toBe('Hoje, 29/09')
    expect(rotuloDoDia('2026-09-30', '2026-09-29')).toBe('Amanhã, 30/09')
    expect(rotuloDoDia('2026-10-01', '2026-09-29')).toBe('Quinta-feira, 01/10')
    expect(rotuloDoDia('2026-10-04', '2026-09-29')).toBe('Domingo, 04/10')
    expect(rotuloDoDia('2026-10-05', '2026-09-29')).toBe('Segunda-feira, 05/10')
  })
})

const item = (codigo: string, data: string, inicio: string) => ({ codigo, data, inicio })

describe('doDia', () => {
  it('só os do dia, em ordem de início (a API manda do mais novo para o mais antigo)', () => {
    const lista = [
      item('1019', '2026-10-01', '08:30'),
      item('1015', '2026-09-29', '15:00'),
      item('1014', '2026-09-29', '10:30'),
      item('1013', '2026-09-29', '07:30'),
      item('1010', '2026-09-28', '16:00'),
    ]
    expect(doDia(lista, '2026-09-29').map((a) => a.codigo)).toEqual(['1013', '1014', '1015'])
    expect(doDia(lista, '2026-10-02')).toEqual([])
  })

  it('no mesmo horário, desempata pelo código (a ordem de criação do protótipo)', () => {
    const lista = [item('1100', '2026-09-29', '09:00'), item('999', '2026-09-29', '09:00')]
    expect(doDia(lista, '2026-09-29').map((a) => a.codigo)).toEqual(['999', '1100'])
  })
})

describe('datasComAtendimento', () => {
  it('conjunto das datas com pelo menos um acionamento', () => {
    const datas = datasComAtendimento([
      { data: '2026-09-29' },
      { data: '2026-09-29' },
      { data: '2026-10-01' },
    ])
    expect([...datas].sort()).toEqual(['2026-09-29', '2026-10-01'])
  })
})

import { describe, expect, it } from 'vitest'
import { dataSP, horarioSP } from './datas'

describe('datas em São Paulo', () => {
  it('usa o dia de São Paulo mesmo quando em UTC já é o dia seguinte', () => {
    expect(dataSP(new Date('2026-09-29T01:30:00Z'))).toBe('2026-09-28')
  })
  it('formata o horário local', () => {
    expect(horarioSP(new Date('2026-09-28T13:05:00Z'))).toBe('10:05')
    expect(horarioSP(new Date('2026-09-28T03:00:00Z'))).toBe('00:00')
  })
})

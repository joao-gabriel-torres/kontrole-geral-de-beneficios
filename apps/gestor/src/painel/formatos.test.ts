import { describe, expect, it } from 'vitest'
import { duracao, percentual, rotuloDaBarra } from './formatos'

describe('duracao', () => {
  it('formata minutos como "1h46"', () => {
    expect(duracao(106.15)).toBe('1h46')
    expect(duracao(200)).toBe('3h20')
    expect(duracao(0)).toBe('0h00')
  })

  it('o .5 sobe (82,5 → 1h23; 122,5 → 2h03)', () => {
    expect(duracao(82.5)).toBe('1h23')
    expect(duracao(122.5)).toBe('2h03')
  })

  it('arredonda os minutos totais antes de dividir: nunca "1h60"', () => {
    expect(duracao(119.6)).toBe('2h00')
  })

  it('sem dados, travessão', () => {
    expect(duracao(null)).toBe('—')
  })
})

describe('percentual', () => {
  it('arredonda com o .5 para cima (1 de 8 → 13)', () => {
    expect(percentual(1, 8)).toBe(13)
    expect(percentual(8, 11)).toBe(73)
    expect(percentual(2, 3)).toBe(67)
  })

  it('pode passar de 100', () => {
    expect(percentual(3, 2)).toBe(150)
  })

  it('sem total, 0', () => {
    expect(percentual(0, 0)).toBe(0)
  })
})

describe('rotuloDaBarra', () => {
  it('em 7 dias, o dia da semana curto', () => {
    expect(rotuloDaBarra('2026-09-23', 0, 7)).toBe('Qua')
    expect(rotuloDaBarra('2026-09-27', 4, 7)).toBe('Dom')
    expect(rotuloDaBarra('2026-09-29', 6, 7)).toBe('Ter')
  })

  it('em 30 dias, o dia do mês nos índices múltiplos de 5 e no último (hoje)', () => {
    const rotulos = Array.from({ length: 30 }, (_, i) => {
      const data = new Date(Date.UTC(2026, 7, 31 + i)).toISOString().slice(0, 10)
      return rotuloDaBarra(data, i, 30)
    })
    expect(rotulos.filter(Boolean)).toEqual(['31', '05', '10', '15', '20', '25', '29'])
    expect(rotulos[1]).toBe('')
    expect(rotulos[29]).toBe('29')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { dimensoesAlvo, isoComFuso, LADO_MAXIMO, prepararArquivo, QUALIDADE_JPEG } from './fotos'

describe('dimensoesAlvo', () => {
  it('reduz a paisagem para 1600px no lado maior', () => {
    expect(dimensoesAlvo(4000, 3000)).toEqual({ largura: 1600, altura: 1200, fator: 0.4 })
  })

  it('reduz o retrato pelo lado maior (a altura)', () => {
    expect(dimensoesAlvo(3000, 4000)).toEqual({ largura: 1200, altura: 1600, fator: 0.4 })
  })

  it('não amplia fotos menores que o limite', () => {
    expect(dimensoesAlvo(800, 600)).toEqual({ largura: 800, altura: 600, fator: 1 })
    expect(dimensoesAlvo(1600, 900)).toEqual({ largura: 1600, altura: 900, fator: 1 })
  })

  it('arredonda e nunca chega a zero', () => {
    expect(dimensoesAlvo(4032, 3024)).toEqual({ largura: 1600, altura: 1200, fator: 1600 / 4032 })
    expect(dimensoesAlvo(1601, 1)).toMatchObject({ largura: 1600, altura: 1 })
  })

  it('usa os valores do spec', () => {
    expect(LADO_MAXIMO).toBe(1600)
    expect(QUALIDADE_JPEG).toBe(0.8)
  })
})

describe('isoComFuso', () => {
  it('grava a hora local com o fuso (TZ dos testes: America/Sao_Paulo)', () => {
    expect(isoComFuso(new Date('2026-09-28T18:10:05Z'))).toBe('2026-09-28T15:10:05-03:00')
    expect(isoComFuso(new Date('2026-01-02T02:03:04Z'))).toBe('2026-01-01T23:03:04-03:00')
  })
})

describe('prepararArquivo', () => {
  afterEach(() => vi.useRealTimers())

  it('marca tiradaEm no momento da captura, antes de redimensionar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-28T18:10:00Z'))
    const reduzida = new Blob(['jpeg'], { type: 'image/jpeg' })
    const redimensionar = vi.fn(async () => {
      vi.setSystemTime(new Date('2026-09-28T18:10:09Z'))
      return reduzida
    })
    const original = new File(['x'], 'foto.heic', { type: 'image/heic' })
    const foto = await prepararArquivo(original, redimensionar)
    expect(redimensionar).toHaveBeenCalledWith(original)
    expect(foto).toEqual({ arquivo: reduzida, tiradaEm: '2026-09-28T15:10:00-03:00' })
  })
})

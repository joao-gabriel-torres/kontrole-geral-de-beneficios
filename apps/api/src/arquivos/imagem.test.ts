import { describe, expect, it } from 'vitest'
import { detectarTipoImagem, mimeDaChave } from './imagem'

const bytes = (...valores: number[]) => new Uint8Array(valores)
const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0))

describe('detectarTipoImagem', () => {
  it('reconhece JPEG, PNG, WebP e HEIC pelos primeiros bytes', () => {
    expect(detectarTipoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({
      mime: 'image/jpeg',
      extensao: 'jpg',
    })
    expect(detectarTipoImagem(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      mime: 'image/png',
      extensao: 'png',
    })
    expect(detectarTipoImagem(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toEqual({
      mime: 'image/webp',
      extensao: 'webp',
    })
    expect(detectarTipoImagem(bytes(0, 0, 0, 24, ...ascii('ftypheic')))).toEqual({
      mime: 'image/heic',
      extensao: 'heic',
    })
  })
  it('recusa qualquer outra coisa, mesmo com nome de imagem', () => {
    expect(detectarTipoImagem(bytes(...ascii('%PDF-1.7')))).toBeNull()
    expect(detectarTipoImagem(bytes(...ascii('olá')))).toBeNull()
    expect(detectarTipoImagem(bytes())).toBeNull()
  })
})

describe('mimeDaChave', () => {
  it('deduz o tipo pela extensão gravada', () => {
    expect(mimeDaChave('a/b.jpg')).toBe('image/jpeg')
    expect(mimeDaChave('a/b.webp')).toBe('image/webp')
    expect(mimeDaChave('a/b.bin')).toBe('application/octet-stream')
  })
})

import { describe, expect, it } from 'vitest'
import {
  corDoPrestador,
  digitosVerificadoresValidos,
  soDigitos,
  telefoneValido,
  tipoDeDocumento,
} from './documentos'

describe('soDigitos', () => {
  it('tira pontuação e espaços', () => {
    expect(soDigitos(' 529.982.247-25 ')).toBe('52998224725')
    expect(soDigitos('(11) 98734-2210')).toBe('11987342210')
  })
})

describe('tipoDeDocumento', () => {
  it('11 dígitos é CPF, 14 é CNPJ e o resto não é documento', () => {
    expect(tipoDeDocumento('52998224725')).toBe('cpf')
    expect(tipoDeDocumento('11222333000181')).toBe('cnpj')
    expect(tipoDeDocumento('1234567890')).toBeNull()
    expect(tipoDeDocumento('')).toBeNull()
  })
})

describe('digitosVerificadoresValidos', () => {
  it.each(['52998224725', '11222333000181'])('aceita %s', (d) => {
    expect(digitosVerificadoresValidos(d)).toBe(true)
  })

  it.each([
    ['CPF com DV errado', '52998224726'],
    ['CNPJ com DV errado', '11222333000182'],
    ['CPF de dígitos repetidos (o modelo da planilha)', '00000000000'],
    ['CNPJ de dígitos repetidos', '11111111111111'],
    ['tamanho que não é CPF nem CNPJ', '123'],
  ])('recusa %s', (_, d) => {
    expect(digitosVerificadoresValidos(d)).toBe(false)
  })

  it('os documentos do seed (vindos do protótipo) não têm DV válido', () => {
    expect(digitosVerificadoresValidos('21977438012')).toBe(false)
    expect(digitosVerificadoresValidos('41206557000190')).toBe(false)
  })
})

describe('telefoneValido', () => {
  it.each([
    ['1134567890', true],
    ['11987342210', true],
    ['987342210', false],
    ['119873422101', false],
  ])('%s → %s', (t, valido) => {
    expect(telefoneValido(t)).toBe(valido)
  })
})

describe('corDoPrestador', () => {
  it('segue a paleta do protótipo pela posição do cadastro, em ciclo de 8', () => {
    expect(corDoPrestador(0)).toBe('#0069BD')
    expect(corDoPrestador(7)).toBe('#A6A6A6')
    expect(corDoPrestador(8)).toBe('#0069BD')
  })
})

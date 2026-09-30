import { describe, expect, it } from 'vitest'
import { digitosCep, erroDoCep, formatarCep } from './cep'

describe('CEP', () => {
  it('só os dígitos, no máximo 8', () => {
    expect(digitosCep(' 01310-200 ')).toBe('01310200')
    expect(digitosCep('013102009')).toBe('01310200')
  })

  it('formata com hífen a partir do sexto dígito', () => {
    expect(formatarCep('01310200')).toBe('01310-200')
    expect(formatarCep('013102')).toBe('01310-2')
    expect(formatarCep('01310')).toBe('01310')
    expect(formatarCep('')).toBe('')
  })

  it('erro só para CEP começado e incompleto', () => {
    expect(erroDoCep('')).toBe('')
    expect(erroDoCep('01310-200')).toBe('')
    expect(erroDoCep('0131')).toBe('Informe um CEP com 8 dígitos')
  })
})

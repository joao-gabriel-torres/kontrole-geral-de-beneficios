import { describe, expect, it } from 'vitest'
import { formatarDocumento, formatarTelefone } from './documentos'

describe('formatarDocumento', () => {
  it('formata CPF e CNPJ gravados só com dígitos', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('outro tamanho volta como veio', () => {
    expect(formatarDocumento('123')).toBe('123')
  })
})

describe('formatarTelefone', () => {
  it('formata celular e fixo com DDD', () => {
    expect(formatarTelefone('11987342210')).toBe('(11) 98734-2210')
    expect(formatarTelefone('1134567890')).toBe('(11) 3456-7890')
  })
  it('outro tamanho volta como veio', () => {
    expect(formatarTelefone('987342210')).toBe('987342210')
  })
})

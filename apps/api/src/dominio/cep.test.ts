import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import { montarEndereco, normalizarCep, normalizarCepOpcional } from './cep'

describe('normalizarCep', () => {
  it('aceita 8 dígitos com ou sem hífen e devolve só os dígitos', () => {
    expect(normalizarCep('01310200')).toBe('01310200')
    expect(normalizarCep('01310-200')).toBe('01310200')
    expect(normalizarCep(' 01310-200 ')).toBe('01310200')
  })

  it('recusa o que não for um CEP de 8 dígitos', () => {
    for (const invalido of ['0131020', '013102000', '01310 200', 'abcdefgh', '01310_200', '']) {
      let erro: unknown
      try {
        normalizarCep(invalido)
      } catch (e) {
        erro = e
      }
      expect(erro, `esperava recusar ${JSON.stringify(invalido)}`).toBeInstanceOf(ErroDominio)
      expect(erro).toMatchObject({
        codigo: 'cep_invalido',
        status: 422,
        message: 'Informe um CEP com 8 dígitos',
      })
    }
  })
})

describe('normalizarCepOpcional', () => {
  it('vazio vira null; informado é normalizado; inválido é recusado', () => {
    expect(normalizarCepOpcional(undefined)).toBeNull()
    expect(normalizarCepOpcional(null)).toBeNull()
    expect(normalizarCepOpcional('   ')).toBeNull()
    expect(normalizarCepOpcional('01310-200')).toBe('01310200')
    expect(() => normalizarCepOpcional('123')).toThrow(ErroDominio)
  })
})

describe('montarEndereco', () => {
  it('monta o endereço de exibição no formato do protótipo', () => {
    expect(
      montarEndereco({ logradouro: 'Rua Harmonia', numero: '410', bairro: 'Vila Madalena' }),
    ).toBe('Rua Harmonia, 410 · Vila Madalena')
  })

  it('põe o complemento depois do número, quando existe', () => {
    const base = { logradouro: 'Rua Harmonia', numero: '410', bairro: 'Vila Madalena' }
    expect(montarEndereco({ ...base, complemento: 'apto 52' })).toBe(
      'Rua Harmonia, 410, apto 52 · Vila Madalena',
    )
    expect(montarEndereco({ ...base, complemento: '  apto 52 ' })).toBe(
      'Rua Harmonia, 410, apto 52 · Vila Madalena',
    )
    for (const vazio of [null, '', '   ']) {
      expect(montarEndereco({ ...base, complemento: vazio })).toBe(
        'Rua Harmonia, 410 · Vila Madalena',
      )
    }
  })
})

import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import {
  chaveDoEndereco,
  consultasDoEndereco,
  dentroDoBrasil,
  ehEnderecoDoAssinante,
  normalizarCoordenadas,
  normalizarEnderecoDeBusca,
  TAMANHO_MAXIMO_ENDERECO,
} from './localizacao'

function erroDe(executar: () => unknown): unknown {
  try {
    executar()
  } catch (e) {
    return e
  }
  return undefined
}

describe('dentroDoBrasil', () => {
  it('aceita os extremos do território, com as ilhas oceânicas', () => {
    for (const [latitude, longitude] of [
      [-23.5505, -46.6333], // São Paulo
      [5.2719, -60.2131], // Monte Caburaí (norte)
      [-33.7507, -53.3947], // Arroio Chuí (sul)
      [-7.5372, -73.9922], // Serra do Contamana (oeste)
      [-7.1487, -34.7928], // Ponta do Seixas (leste)
      [-3.8543, -32.4247], // Fernando de Noronha
      [-20.5147, -28.8483], // Martim Vaz
    ] as const) {
      expect(dentroDoBrasil({ latitude, longitude }), `${latitude}, ${longitude}`).toBe(true)
    }
  })

  it('recusa o que fica fora da faixa do Brasil', () => {
    for (const [latitude, longitude] of [
      [40.7128, -74.006], // Nova York
      [-23.5505, 46.6333], // longitude com o sinal trocado
      [23.5505, -46.6333], // latitude com o sinal trocado
      [-34.9, -56.16], // Montevidéu
      [0, 0],
      [-91, -46],
      [-23, -181],
    ] as const) {
      expect(dentroDoBrasil({ latitude, longitude }), `${latitude}, ${longitude}`).toBe(false)
    }
  })
})

describe('normalizarCoordenadas', () => {
  it('sem as duas, não há localização', () => {
    expect(normalizarCoordenadas(undefined, undefined)).toBeNull()
    expect(normalizarCoordenadas(null, null)).toBeNull()
    expect(normalizarCoordenadas(null, undefined)).toBeNull()
  })

  it('arredonda para 6 casas (uns 10 cm)', () => {
    expect(normalizarCoordenadas(-23.5671492, -46.6644067)).toEqual({
      latitude: -23.567149,
      longitude: -46.664407,
    })
    expect(normalizarCoordenadas(-23.5, -46)).toEqual({ latitude: -23.5, longitude: -46 })
  })

  it('só uma das duas é recusada', () => {
    for (const [latitude, longitude] of [
      [-23.5, undefined],
      [undefined, -46.6],
      [-23.5, null],
      [null, -46.6],
    ] as const) {
      const erro = erroDe(() => normalizarCoordenadas(latitude, longitude))
      expect(erro).toBeInstanceOf(ErroDominio)
      expect(erro).toMatchObject({
        codigo: 'localizacao_invalida',
        status: 422,
        message: 'Informe a latitude e a longitude juntas',
      })
    }
  })

  it('fora do Brasil ou número que não é finito é recusado', () => {
    for (const [latitude, longitude] of [
      [40.7128, -74.006],
      [-23.5, 46.6],
      [Number.NaN, -46.6],
      [-23.5, Number.POSITIVE_INFINITY],
    ] as const) {
      const erro = erroDe(() => normalizarCoordenadas(latitude, longitude))
      expect(erro, `${latitude}, ${longitude}`).toBeInstanceOf(ErroDominio)
      expect(erro).toMatchObject({
        codigo: 'localizacao_invalida',
        status: 422,
        message: 'A localização precisa ficar no Brasil',
      })
    }
  })
})

describe('normalizarEnderecoDeBusca', () => {
  it('apara as pontas e junta os espaços repetidos', () => {
    expect(normalizarEnderecoDeBusca('  Rua Harmonia,   410 ·  Vila Madalena ')).toBe(
      'Rua Harmonia, 410 · Vila Madalena',
    )
  })

  it('vazio (ou ausente) é recusado', () => {
    for (const vazio of [undefined, '', '   ']) {
      const erro = erroDe(() => normalizarEnderecoDeBusca(vazio))
      expect(erro).toBeInstanceOf(ErroDominio)
      expect(erro).toMatchObject({
        codigo: 'endereco_obrigatorio',
        status: 422,
        message: 'Informe o endereço',
      })
    }
  })

  it(`mais de ${TAMANHO_MAXIMO_ENDERECO} caracteres é recusado`, () => {
    expect(normalizarEnderecoDeBusca('a'.repeat(TAMANHO_MAXIMO_ENDERECO))).toHaveLength(
      TAMANHO_MAXIMO_ENDERECO,
    )
    const erro = erroDe(() => normalizarEnderecoDeBusca('a'.repeat(TAMANHO_MAXIMO_ENDERECO + 1)))
    expect(erro).toBeInstanceOf(ErroDominio)
    expect(erro).toMatchObject({
      codigo: 'endereco_longo',
      status: 422,
      message: `O endereço passa de ${TAMANHO_MAXIMO_ENDERECO} caracteres`,
    })
  })
})

describe('chaveDoEndereco', () => {
  it('ignora acentos, maiúsculas e espaços repetidos', () => {
    expect(chaveDoEndereco('Rua  Antônio Agu, 100 · CENTRO')).toBe(
      chaveDoEndereco('rua antonio agu, 100 · centro'),
    )
    expect(chaveDoEndereco('Rua A, 1 · Centro')).not.toBe(chaveDoEndereco('Rua A, 2 · Centro'))
  })
})

describe('consultasDoEndereco', () => {
  it('na capital: com o bairro e, se não achar, só rua, número e cidade', () => {
    expect(consultasDoEndereco('Rua Harmonia, 410 · Vila Madalena')).toEqual([
      'Rua Harmonia, 410, Vila Madalena, São Paulo',
      'Rua Harmonia, 410, São Paulo',
    ])
  })

  it('deixa o complemento de fora', () => {
    expect(consultasDoEndereco('Rua Harmonia, 410, apto 52 · Vila Madalena')).toEqual([
      'Rua Harmonia, 410, Vila Madalena, São Paulo',
      'Rua Harmonia, 410, São Paulo',
    ])
  })

  it('outra cidade: a que vem no fim ("Osasco - SP") no lugar de São Paulo', () => {
    expect(consultasDoEndereco('Rua Antônio Agu, 100 · Centro · Osasco - SP')).toEqual([
      'Rua Antônio Agu, 100, Centro, Osasco, SP',
      'Rua Antônio Agu, 100, Osasco, SP',
    ])
  })

  it('sem bairro, uma consulta só', () => {
    expect(consultasDoEndereco('Rua Harmonia, 410')).toEqual(['Rua Harmonia, 410, São Paulo'])
  })

  it('texto livre fica como veio, com a cidade como no link do mapa', () => {
    expect(consultasDoEndereco('Av. Paulista 1000')).toEqual(['Av. Paulista 1000, São Paulo'])
    expect(consultasDoEndereco('Rua Antônio Agu, 100, Osasco - SP')).toEqual([
      'Rua Antônio Agu, 100, Osasco, SP',
    ])
  })
})

describe('ehEnderecoDoAssinante', () => {
  const assinante = {
    cep: '01426002',
    logradouro: 'Rua Oscar Freire',
    numero: '900',
    complemento: null,
    bairro: 'Jardins',
  }

  it('o endereço do assinante, com o CEP dele ou sem CEP', () => {
    const endereco = 'Rua Oscar Freire, 900 · Jardins'
    expect(ehEnderecoDoAssinante({ cep: '01426002', endereco }, assinante)).toBe(true)
    expect(ehEnderecoDoAssinante({ cep: null, endereco }, assinante)).toBe(true)
  })

  it('o endereço do assinante com a cidade no fim (fora da capital)', () => {
    const osasco = { ...assinante, cep: '06010000', logradouro: 'Rua Antônio Agu', numero: '100' }
    expect(
      ehEnderecoDoAssinante(
        { cep: '06010000', endereco: 'Rua Antônio Agu, 100 · Jardins · Osasco - SP' },
        osasco,
      ),
    ).toBe(true)
  })

  it('o complemento do assinante faz parte do endereço', () => {
    const comApto = { ...assinante, complemento: 'loja 2' }
    expect(
      ehEnderecoDoAssinante(
        { cep: '01426002', endereco: 'Rua Oscar Freire, 900, loja 2 · Jardins' },
        comApto,
      ),
    ).toBe(true)
    expect(
      ehEnderecoDoAssinante({ cep: '01426002', endereco: 'Rua Oscar Freire, 900 · Jardins' }, comApto),
    ).toBe(false)
  })

  it('outro CEP é outro endereço', () => {
    expect(
      ehEnderecoDoAssinante({ cep: '01310200', endereco: 'Rua Oscar Freire, 900 · Jardins' }, assinante),
    ).toBe(false)
  })

  it('mesmo CEP, outro número: é outro endereço', () => {
    expect(
      ehEnderecoDoAssinante({ cep: '01426002', endereco: 'Rua Oscar Freire, 902 · Jardins' }, assinante),
    ).toBe(false)
    expect(
      ehEnderecoDoAssinante({ cep: '01426002', endereco: 'Rua Oscar Freire, 90 · Jardins' }, assinante),
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import {
  mensagemBloqueio,
  normalizarPrestador,
  ordenarPorNome,
  somarCarga,
  validarPrestador,
  type DadosPrestador,
} from './prestadores'

const VALIDO: DadosPrestador = {
  nome: 'Pedro Lima',
  documento: '529.982.247-25',
  telefone: '(11) 91234-5678',
  especialidades: ['t1'],
}

function erroDe(f: () => void): ErroDominio {
  try {
    f()
  } catch (e) {
    if (e instanceof ErroDominio) return e
    throw e
  }
  throw new Error('não lançou')
}

describe('normalizarPrestador', () => {
  it('apara, guarda só dígitos, vazio vira null e tira especialidades repetidas', () => {
    expect(
      normalizarPrestador({
        ...VALIDO,
        nome: '  Pedro  Lima ',
        email: ' ',
        regiao: ' Centro ',
        especialidades: ['t2', 't1', 't2'],
      }),
    ).toEqual({
      nome: 'Pedro  Lima',
      documento: '52998224725',
      telefone: '11912345678',
      email: null,
      regiao: 'Centro',
      especialidades: ['t2', 't1'],
    })
  })

  it('e-mail e região ausentes viram null', () => {
    const p = normalizarPrestador({ ...VALIDO, email: undefined, regiao: null })
    expect([p.email, p.regiao]).toEqual([null, null])
  })
})

describe('validarPrestador (ordem do protótipo)', () => {
  const validar = (d: Partial<DadosPrestador>, ctx: Parameters<typeof validarPrestador>[1] = {}) =>
    validarPrestador(normalizarPrestador({ ...VALIDO, ...d }), ctx)

  it('aceita um cadastro válido', () => {
    expect(() => validar({})).not.toThrow()
  })

  it('nome vazio vem primeiro', () => {
    expect(erroDe(() => validar({ nome: '  ', documento: '', telefone: '' }))).toMatchObject({
      codigo: 'nome_obrigatorio',
      message: 'Informe o nome',
      status: 422,
    })
  })

  it('documento sem 11 ou 14 dígitos', () => {
    expect(erroDe(() => validar({ documento: '123', telefone: '' }))).toMatchObject({
      codigo: 'documento_invalido',
      message: 'CPF ou CNPJ inválido',
      status: 422,
    })
  })

  it('duplicado (409) vem antes do dígito verificador', () => {
    const e = erroDe(() =>
      validar({ documento: '318.402.117-50' }, { donoDoDocumento: 'Carlos Mendes' }),
    )
    expect(e).toMatchObject({
      codigo: 'documento_duplicado',
      message: 'Documento já cadastrado para Carlos Mendes',
      status: 409,
    })
  })

  it('dígito verificador errado em documento novo', () => {
    expect(erroDe(() => validar({ documento: '529.982.247-26' }))).toMatchObject({
      codigo: 'documento_invalido',
      message: 'CPF ou CNPJ inválido',
    })
  })

  it('dígito verificador errado em documento alterado', () => {
    expect(
      erroDe(() => validar({ documento: '219.774.380-12' }, { documentoAtual: '31840211750' })),
    ).toMatchObject({ codigo: 'documento_invalido' })
  })

  it('o documento que já estava gravado não passa pelo dígito verificador (seed)', () => {
    expect(() =>
      validar({ documento: '318.402.117-50' }, { documentoAtual: '31840211750' }),
    ).not.toThrow()
  })

  it('telefone sem DDD vem por último', () => {
    expect(erroDe(() => validar({ telefone: '91234-5678' }))).toMatchObject({
      codigo: 'telefone_invalido',
      message: 'Informe o telefone com DDD',
      status: 422,
    })
  })

  it('e-mail, quando informado, precisa ser um endereço (ele vira o login do convite)', () => {
    for (const email of ['a@x.com; b@y.com', 'carlos', 'carlos@', 'a b@x.com']) {
      const e = erroDe(() => validar({ email }))
      expect([e.codigo, e.message, e.status]).toEqual([
        'email_invalido',
        'Informe um e-mail válido',
        422,
      ])
    }
    expect(() => validar({ email: ' Carlos.Mendes@Email.com ' })).not.toThrow()
    expect(() => validar({ email: '' })).not.toThrow()
  })

  it('aceita CNPJ válido e telefone fixo', () => {
    expect(() =>
      validar({ documento: '11.222.333/0001-81', telefone: '(11) 3456-7890' }),
    ).not.toThrow()
  })
})

describe('somarCarga', () => {
  it('conta em aberto (aberto, em execução, reprovado e aguardando) e o total', () => {
    const carga = somarCarga([
      { prestadorId: 'p1', status: 'aberto', quantidade: 5 },
      { prestadorId: 'p1', status: 'aguardando', quantidade: 2 },
      { prestadorId: 'p1', status: 'reprovado', quantidade: 1 },
      { prestadorId: 'p1', status: 'aprovado', quantidade: 12 },
      { prestadorId: 'p2', status: 'em_andamento', quantidade: 1 },
    ])
    expect(carga.get('p1')).toEqual({ emAberto: 8, total: 20 })
    expect(carga.get('p2')).toEqual({ emAberto: 1, total: 1 })
    expect(carga.get('p3')).toBeUndefined()
  })
})

describe('ordenarPorNome', () => {
  it('segue a ordem do português, sem mudar a lista original', () => {
    const lista = [{ nome: 'Érica' }, { nome: 'Ana' }, { nome: 'eduardo' }, { nome: 'Fábio' }]
    expect(ordenarPorNome(lista).map((p) => p.nome)).toEqual(['Ana', 'eduardo', 'Érica', 'Fábio'])
    expect(lista[0]!.nome).toBe('Érica')
  })
})

describe('mensagemBloqueio', () => {
  it('singular', () => {
    expect(mensagemBloqueio('Marina Costa', 1)).toBe(
      'Marina Costa tem 1 acionamento em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.',
    )
  })
  it('plural', () => {
    expect(mensagemBloqueio('Carlos Mendes', 8)).toBe(
      'Carlos Mendes tem 8 acionamentos em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.',
    )
  })
})

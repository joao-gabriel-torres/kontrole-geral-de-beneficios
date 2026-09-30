import { describe, expect, it } from 'vitest'
import {
  chaveDoNome,
  corDoNovoTipo,
  exigirNomeLivre,
  exigirOutroTipoAtivo,
  normalizarCategoria,
  normalizarChecklist,
  normalizarNomeTipo,
} from './tipos'

function erroDe(fn: () => unknown): unknown {
  try {
    fn()
  } catch (erro) {
    return erro
  }
  throw new Error('a função não lançou erro')
}

describe('corDoNovoTipo', () => {
  it('usa a paleta do protótipo pela quantidade de tipos não excluídos', () => {
    expect(corDoNovoTipo(8)).toBe('#0069BD')
    expect(corDoNovoTipo(9)).toBe('#FC7608')
    expect(corDoNovoTipo(2)).toBe('#B37BE7')
    expect(corDoNovoTipo(15)).toBe('#47C272')
  })
})

describe('normalizarNomeTipo', () => {
  it('tira os espaços das pontas', () => {
    expect(normalizarNomeTipo('  Jardinagem  ')).toBe('Jardinagem')
  })

  it('junta espaços internos repetidos: "Ponto  de luz" é o mesmo nome', () => {
    expect(normalizarNomeTipo('Ponto  de \t luz')).toBe('Ponto de luz')
  })

  it('recusa nome vazio (422)', () => {
    expect(erroDe(() => normalizarNomeTipo('   '))).toMatchObject({
      codigo: 'nome_obrigatorio',
      message: 'Informe o nome do tipo',
      status: 422,
    })
  })

  it('aceita até 60 caracteres depois do trim', () => {
    expect(normalizarNomeTipo(` ${'a'.repeat(60)} `)).toHaveLength(60)
    expect(erroDe(() => normalizarNomeTipo('a'.repeat(61)))).toMatchObject({
      codigo: 'texto_longo',
      status: 422,
    })
  })
})

describe('normalizarChecklist', () => {
  it('faz trim e descarta as etapas vazias', () => {
    expect(normalizarChecklist([' Avaliar ', '', '   ', 'Testar'])).toEqual(['Avaliar', 'Testar'])
  })

  it('aceita etapa de até 200 caracteres', () => {
    expect(normalizarChecklist(['b'.repeat(200)])).toHaveLength(1)
    expect(erroDe(() => normalizarChecklist(['b'.repeat(201)]))).toMatchObject({
      codigo: 'texto_longo',
      status: 422,
    })
  })
})

describe('exigirNomeLivre', () => {
  const existentes = [
    { id: 't2', nome: 'Revisão elétrica' },
    { id: 't5', nome: 'Pintura' },
  ]

  it('compara sem acentos e sem maiúsculas (409)', () => {
    expect(chaveDoNome(' Revisão ELÉTRICA ')).toBe('revisao eletrica')
    for (const nome of ['pintura', 'Revisao eletrica']) {
      expect(erroDe(() => exigirNomeLivre(nome, existentes))).toMatchObject({
        codigo: 'nome_duplicado',
        message: 'Já existe um tipo com esse nome',
        status: 409,
      })
    }
  })

  it('espaços internos repetidos não disfarçam um nome já usado (409)', () => {
    expect(chaveDoNome('Ponto  de   LUZ')).toBe('ponto de luz')
    expect(
      erroDe(() => exigirNomeLivre('Ponto  de luz', [{ id: 't9', nome: 'Ponto de luz' }])),
    ).toMatchObject({ codigo: 'nome_duplicado', status: 409 })
  })

  it('o próprio tipo não conta (renomear para outra grafia)', () => {
    expect(() => exigirNomeLivre('PINTURA', existentes, 't5')).not.toThrow()
  })

  it('nome diferente passa', () => {
    expect(() => exigirNomeLivre('Pintura externa', existentes)).not.toThrow()
  })
})

describe('normalizarCategoria', () => {
  it('apara os espaços; vazio e null viram null (a tela mostra "Outros")', () => {
    expect(normalizarCategoria(' Elétrica ')).toBe('Elétrica')
    expect(normalizarCategoria('   ')).toBeNull()
    expect(normalizarCategoria(null)).toBeNull()
  })

  it('recusa categoria com mais de 60 caracteres (422)', () => {
    expect(erroDe(() => normalizarCategoria('a'.repeat(61)))).toMatchObject({
      codigo: 'texto_longo',
      message: 'A categoria pode ter até 60 caracteres',
      status: 422,
    })
    expect(() => normalizarCategoria('a'.repeat(60))).not.toThrow()
  })
})

describe('exigirOutroTipoAtivo', () => {
  it('recusa excluir o último tipo ativo (409)', () => {
    expect(erroDe(() => exigirOutroTipoAtivo(1))).toMatchObject({
      codigo: 'ultimo_tipo',
      message: 'Mantenha pelo menos um tipo de demanda',
      status: 409,
    })
    expect(() => exigirOutroTipoAtivo(2)).not.toThrow()
  })
})

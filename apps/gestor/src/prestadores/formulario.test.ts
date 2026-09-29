import { describe, expect, it } from 'vitest'
import {
  alternarEspecialidade,
  corpoDoFormulario,
  erroDoFormulario,
  ERROS_DO_FORMULARIO,
  formularioDe,
  formularioVazio,
  mostrarErro,
  textoExclusao,
  tituloExclusao,
  type FormularioPrestador,
} from './formulario'
import { prestador, SEED_PRESTADORES } from './teste/dados'

const valido = (dados: Partial<FormularioPrestador> = {}): FormularioPrestador => ({
  ...formularioVazio(),
  nome: 'Pedro Lima',
  documento: '529.982.247-25',
  telefone: '(11) 91234-5678',
  ...dados,
})

describe('formulário', () => {
  it('Novo começa vazio', () => {
    expect(formularioVazio()).toEqual({
      id: null,
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      regiao: '',
      especialidades: [],
    })
  })

  it('Editar abre com documento e telefone formatados e as especialidades na ordem', () => {
    expect(formularioDe(prestador())).toEqual({
      id: 'p1',
      nome: 'Carlos Mendes',
      documento: '318.402.117-50',
      telefone: '(11) 98734-2210',
      email: 'carlos.mendes@email.com',
      regiao: 'Zona Oeste',
      especialidades: ['t1', 't2', 't3', 't4'],
    })
    expect(formularioDe(prestador({ email: null, regiao: null }))).toMatchObject({
      email: '',
      regiao: '',
    })
  })

  it('especialidades ligam e desligam na ordem dos cliques', () => {
    expect(alternarEspecialidade(['t1'], 't5')).toEqual(['t1', 't5'])
    expect(alternarEspecialidade(['t1', 't5'], 't1')).toEqual(['t5'])
  })

  it('o corpo vai como digitado (a API normaliza)', () => {
    expect(
      corpoDoFormulario(valido({ id: 'p9', email: ' a@b.c ', especialidades: ['t2'] })),
    ).toEqual({
      nome: 'Pedro Lima',
      documento: '529.982.247-25',
      telefone: '(11) 91234-5678',
      email: ' a@b.c ',
      regiao: '',
      especialidades: ['t2'],
    })
  })
})

describe('erroDoFormulario (ordem do protótipo)', () => {
  const erro = (dados: Partial<FormularioPrestador>) =>
    erroDoFormulario(valido(dados), SEED_PRESTADORES)

  it('válido', () => expect(erro({})).toBe(''))
  it('nome', () => expect(erro({ nome: '  ', documento: '' })).toBe('Informe o nome'))
  it('documento sem 11 ou 14 dígitos', () =>
    expect(erro({ documento: '123.456', telefone: '' })).toBe('CPF ou CNPJ inválido'))
  it('documento de outro prestador', () =>
    expect(erro({ documento: '31840211750' })).toBe('Documento já cadastrado para Carlos Mendes'))
  it('o próprio documento não é duplicado', () =>
    expect(erro({ id: 'p1', documento: '318.402.117-50' })).toBe(''))
  it('telefone com menos de 10 dígitos', () =>
    expect(erro({ telefone: '91234-5678' })).toBe('Informe o telefone com DDD'))
  it('telefone com mais de 11 dígitos', () =>
    expect(erro({ telefone: '+55 11 91234-5678' })).toBe('Informe o telefone com DDD'))
  it('um prestador do seed abre sem erro no Editar', () => {
    for (const p of SEED_PRESTADORES)
      expect(erroDoFormulario(formularioDe(p), SEED_PRESTADORES)).toBe('')
  })
})

describe('mostrarErro', () => {
  it('só com nome, documento ou telefone preenchidos', () => {
    const vazio = formularioVazio()
    expect(mostrarErro(vazio, erroDoFormulario(vazio, []))).toBe(false)
    const soEmail = { ...vazio, email: 'a@b.c', regiao: 'Centro' }
    expect(mostrarErro(soEmail, erroDoFormulario(soEmail, []))).toBe(false)
    const soNome = { ...vazio, nome: 'Ana' }
    expect(mostrarErro(soNome, erroDoFormulario(soNome, []))).toBe(true)
  })
})

it('os erros de validação da API vão para a linha de erro do formulário', () => {
  for (const codigo of ['documento_duplicado', 'documento_invalido', 'telefone_invalido'])
    expect(ERROS_DO_FORMULARIO.has(codigo)).toBe(true)
  expect(ERROS_DO_FORMULARIO.has('nao_encontrado')).toBe(false)
})

describe('exclusão', () => {
  it('título com espaço antes do "?", como no README', () => {
    expect(tituloExclusao('Ana Ribeiro')).toBe('Excluir Ana Ribeiro ?')
  })
  it('bloqueada, no singular e no plural', () => {
    expect(textoExclusao('Marina Costa', 1)).toBe(
      'Marina Costa tem 1 acionamento em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.',
    )
    expect(textoExclusao('Ana Ribeiro', 2)).toContain('Ana Ribeiro tem 2 acionamentos em aberto.')
  })
  it('livre', () => {
    expect(textoExclusao('Roberto Alves', 0)).toBe(
      'O histórico de acionamentos é mantido nos relatórios. Essa ação não pode ser desfeita.',
    )
  })
})

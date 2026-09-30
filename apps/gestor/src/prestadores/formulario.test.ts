import { describe, expect, it } from 'vitest'
import {
  camposDoCep,
  cidadeComUf,
  consultarCepAoAbrir,
  corpoDoFormulario,
  erroDoFormulario,
  ERROS_DO_FORMULARIO,
  formularioDe,
  formularioVazio,
  mostrarErro,
  rotuloDoConvite,
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
      cep: '',
      cepInexistente: false,
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      regiao: '',
      especialidades: [],
    })
  })

  it('Editar abre com o endereço salvo, documento e telefone formatados e as especialidades na ordem', () => {
    expect(formularioDe(prestador())).toEqual({
      id: 'p1',
      cep: '05422-001',
      cepInexistente: false,
      logradouro: 'Rua dos Pinheiros',
      numero: '812',
      complemento: '',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      nome: 'Carlos Mendes',
      documento: '318.402.117-50',
      telefone: '(11) 98734-2210',
      email: 'carlos.mendes@email.com',
      regiao: 'Zona Oeste',
      especialidades: ['t1', 't2', 't3', 't4'],
    })
    const semEndereco = prestador({
      email: null,
      regiao: null,
      cep: null,
      logradouro: null,
      numero: null,
      bairro: null,
      cidade: null,
      uf: null,
    })
    expect(formularioDe(semEndereco)).toMatchObject({
      email: '',
      regiao: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
    })
  })

  it('o CEP é consultado ao abrir só sem endereço salvo (o Novo, ou um CEP sem rua, bairro e cidade)', () => {
    expect(consultarCepAoAbrir(formularioVazio())).toBe(true)
    expect(consultarCepAoAbrir(formularioDe(prestador()))).toBe(false)
    const soCep = prestador({
      logradouro: null,
      numero: '12',
      bairro: null,
      cidade: null,
      uf: null,
    })
    expect(consultarCepAoAbrir(formularioDe(soCep))).toBe(true)
    expect(consultarCepAoAbrir(formularioDe(prestador({ logradouro: null })))).toBe(false)
  })

  it('rua, bairro, cidade e UF vêm do CEP; sem ele, ficam vazios', () => {
    expect(
      camposDoCep({
        cep: '01001000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      }),
    ).toEqual({ logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' })
    expect(camposDoCep(undefined)).toEqual({ logradouro: '', bairro: '', cidade: '', uf: '' })
  })

  it('a cidade aparece com a UF', () => {
    expect(cidadeComUf('São Paulo', 'SP')).toBe('São Paulo - SP')
    expect(cidadeComUf('Osasco', '')).toBe('Osasco')
    expect(cidadeComUf('', '')).toBe('')
  })

  it('o corpo vai como digitado, com o endereço (a API normaliza)', () => {
    expect(
      corpoDoFormulario(
        valido({
          id: 'p9',
          email: ' a@b.c ',
          cep: '05422-001',
          cepInexistente: false,
          logradouro: 'Rua dos Pinheiros',
          numero: ' 812 ',
          complemento: 'fundos',
          bairro: 'Pinheiros',
          cidade: 'São Paulo',
          uf: 'SP',
          especialidades: ['t2'],
        }),
      ),
    ).toEqual({
      nome: 'Pedro Lima',
      documento: '529.982.247-25',
      telefone: '(11) 91234-5678',
      email: ' a@b.c ',
      regiao: '',
      cep: '05422-001',
      logradouro: 'Rua dos Pinheiros',
      numero: ' 812 ',
      complemento: 'fundos',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
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
  it('CEP opcional, mas com 8 dígitos (com ou sem hífen) quando informado', () => {
    expect(erro({ cep: '  ' })).toBe('')
    expect(erro({ cep: '05422-001' })).toBe('')
    expect(erro({ cep: ' 05422001 ' })).toBe('')
    expect(erro({ cep: '05422-00' })).toBe('Informe um CEP com 8 dígitos')
    expect(erro({ cep: '05.422-001' })).toBe('Informe um CEP com 8 dígitos')
  })
  it('CEP que não existe', () =>
    expect(erro({ cep: '99999-999', cepInexistente: true })).toBe('CEP não encontrado'))
  it('o CEP, primeiro campo, vem antes dos outros erros', () =>
    expect(erro({ cep: '0542', nome: '', documento: '' })).toBe('Informe um CEP com 8 dígitos'))
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
  it('um CEP incompleto espera os outros campos; o CEP que não existe aparece na hora', () => {
    const incompleto = { ...formularioVazio(), cep: '0542' }
    expect(mostrarErro(incompleto, erroDoFormulario(incompleto, []))).toBe(false)
    const inexistente = { ...formularioVazio(), cep: '99999-999', cepInexistente: true }
    expect(mostrarErro(inexistente, erroDoFormulario(inexistente, []))).toBe(true)
  })
})

it('os erros de validação da API vão para a linha de erro do formulário', () => {
  for (const codigo of [
    'documento_duplicado',
    'documento_invalido',
    'telefone_invalido',
    'cep_invalido',
    'uf_invalida',
  ])
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

describe('rotuloDoConvite', () => {
  it('pendente envia, convidado reenvia e quem tem senha redefine; sem e-mail, nada', () => {
    expect(rotuloDoConvite('pendente')).toBe('Enviar convite de acesso')
    expect(rotuloDoConvite('convidado')).toBe('Reenviar convite')
    // A API aceita o convite como redefinição: um e-mail trocado tem conserto pelo gestor.
    expect(rotuloDoConvite('ativo')).toBe('Redefinir acesso')
    expect(rotuloDoConvite('sem_email')).toBeNull()
    expect(rotuloDoConvite(undefined)).toBeNull()
  })
})

import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear, SENHA_DEV } from '@kgb/db/seed'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { corpo, hojeSP, loginDePrestador } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { criarCorreioEmMemoria, trocarCorreio, type CorreioEmMemoria } from '../correio'
import { prisma } from '../db'
import { corDoPrestador } from '../dominio/documentos'
import { mensagemBloqueio } from '../dominio/prestadores'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

interface Cadastro {
  id: string
  nome: string
  documento: string
  telefone: string
  email: string | null
  regiao: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  status: 'ativo' | 'inativo'
  cor: string
  credenciadoDesde: string
  especialidades: { id: string; nome: string }[]
  emAberto: number
  total: number
  acesso: 'sem_email' | 'pendente' | 'convidado' | 'ativo'
}
interface Criado extends Cadastro {
  convite: {
    situacao: 'enviado' | 'falhou' | 'sem_email'
    email: string | null
    mensagem: string | null
  }
}
interface Erro {
  erro: { codigo: string; mensagem: string }
}

/** Volta ao seed do dia; o seed apaga as sessões, então entra de novo. */
async function preparar() {
  await semear(prisma)
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
}
beforeAll(preparar)
afterAll(() => semear(prisma))

let caixa: CorreioEmMemoria
beforeEach(() => {
  caixa = criarCorreioEmMemoria()
  trocarCorreio(caixa)
})
afterEach(() => trocarCorreio(null))

const json = (metodo: string, headers: Record<string, string>, dados?: unknown): RequestInit => ({
  method: metodo,
  headers: { ...headers, 'content-type': 'application/json' },
  body: dados === undefined ? undefined : JSON.stringify(dados),
})
const listar = async () =>
  corpo<Cadastro[]>(app.request('/api/prestadores/cadastro', { headers: gestora }))
const criar = (dados: unknown, headers = gestora) =>
  app.request('/api/prestadores', json('POST', headers, dados))
const editar = (id: string, dados: unknown, headers = gestora) =>
  app.request(`/api/prestadores/${id}`, json('PATCH', headers, dados))
const mudarStatus = (id: string, status: unknown, headers = gestora) =>
  app.request(`/api/prestadores/${id}/status`, json('PATCH', headers, { status }))
const excluir = (id: string, headers = gestora) =>
  app.request(`/api/prestadores/${id}`, { method: 'DELETE', headers })

const NOVO = {
  nome: '  Pedro Lima ',
  documento: '529.982.247-25',
  telefone: '(11) 91234-5678',
  email: ' pedro@lima.com ',
  regiao: ' Centro ',
  especialidades: ['t5', 't1', 't5'],
}
const DADOS_CARLOS = {
  nome: 'Carlos Mendes',
  documento: '31840211750',
  telefone: '11987342210',
  email: 'carlos.mendes@email.com',
  regiao: 'Zona Oeste',
  especialidades: ['t1', 't2', 't3', 't4'],
}

describe('GET /api/prestadores/cadastro', () => {
  it('lista os não excluídos por nome, com carga em aberto e total', async () => {
    const r = await app.request('/api/prestadores/cadastro', { headers: gestora })
    expect(r.status).toBe(200)
    const lista = await corpo<Cadastro[]>(r)
    expect(lista.map((p) => [p.nome, `${p.emAberto}/${p.total}`])).toEqual([
      ['Ana Ribeiro', '2/17'],
      ['Carlos Mendes', '8/20'],
      ['João Pires', '2/18'],
      ['Luciana Prado', '0/0'],
      ['Marina Costa', '1/15'],
      ['Roberto Alves', '0/0'],
    ])
  })

  it('mostra a situação do acesso de cada um (o Carlos já tem senha)', async () => {
    const lista = await listar()
    expect(Object.fromEntries(lista.map((p) => [p.nome, p.acesso]))).toMatchObject({
      'Carlos Mendes': 'ativo',
      'Ana Ribeiro': 'pendente',
    })
  })

  it('traz os campos do cadastro, com as especialidades na ordem gravada', async () => {
    const lista = await listar()
    expect(lista.find((p) => p.id === 'p1')).toEqual({
      id: 'p1',
      nome: 'Carlos Mendes',
      documento: '31840211750',
      telefone: '11987342210',
      email: 'carlos.mendes@email.com',
      regiao: 'Zona Oeste',
      cep: '05422001',
      logradouro: 'Rua dos Pinheiros',
      numero: '812',
      complemento: null,
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      status: 'ativo',
      cor: '#0069BD',
      credenciadoDesde: '2024-03-12',
      especialidades: [
        { id: 't1', nome: 'Vazamento' },
        { id: 't2', nome: 'Revisão elétrica' },
        { id: 't3', nome: 'Ponto de luz' },
        { id: 't4', nome: 'Troca de disjuntor' },
      ],
      emAberto: 8,
      total: 20,
      acesso: 'ativo',
    })
    expect(lista.find((p) => p.id === 'p6')!.especialidades.map((e) => e.nome)).toEqual([
      'Reparo em gesso',
      'Pintura',
    ])
    expect(lista.find((p) => p.id === 'p5')).toMatchObject({ status: 'inativo', cor: '#004E8F' })
  })

  it('não mostra tipos excluídos nas especialidades', async () => {
    await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { excluidoEm: new Date() } })
    try {
      const roberto = (await listar()).find((p) => p.id === 'p5')!
      expect(roberto.especialidades).toEqual([{ id: 't5', nome: 'Pintura' }])
    } finally {
      await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { excluidoEm: null } })
    }
  })

  it('é só para a gestão', async () => {
    expect((await app.request('/api/prestadores/cadastro', { headers: carlos })).status).toBe(403)
    expect((await app.request('/api/prestadores/cadastro')).status).toBe(401)
  })
})

describe('POST /api/prestadores', () => {
  beforeAll(preparar)

  it('credencia com dígitos, ativo, desde hoje e com a próxima cor da paleta', async () => {
    const r = await criar(NOVO)
    expect(r.status).toBe(201)
    const criado = await corpo<Cadastro>(r)
    expect(criado).toMatchObject({
      nome: 'Pedro Lima',
      documento: '52998224725',
      telefone: '11912345678',
      email: 'pedro@lima.com',
      regiao: 'Centro',
      status: 'ativo',
      cor: '#8FB8DE',
      credenciadoDesde: hojeSP(),
      especialidades: [
        { id: 't5', nome: 'Pintura' },
        { id: 't1', nome: 'Vazamento' },
      ],
      emAberto: 0,
      total: 0,
    })
    expect((await listar()).map((p) => p.nome)).toContain('Pedro Lima')
  })

  it('sem cep no corpo, credencia com cep e endereço null', async () => {
    const criado = await corpo<Cadastro>(
      criar({ ...NOVO, nome: 'Sem Cep', documento: '987.654.321-00', email: '' }),
    )
    expect(criado).toMatchObject({
      cep: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
    })
  })

  it('grava o endereço aparado, com a UF em maiúsculas, e devolve no cadastro', async () => {
    const r = await criar({
      ...NOVO,
      nome: 'Com Endereço',
      documento: '046.521.838-52',
      email: '',
      cep: '05422-001',
      logradouro: ' Rua dos Pinheiros ',
      numero: ' 812 ',
      complemento: '  ',
      bairro: 'Pinheiros',
      cidade: 'São Paulo ',
      uf: 'sp',
    })
    expect(r.status).toBe(201)
    const criado = await corpo<Cadastro>(r)
    expect(criado).toMatchObject({
      cep: '05422001',
      logradouro: 'Rua dos Pinheiros',
      numero: '812',
      complemento: null,
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect((await listar()).find((p) => p.id === criado.id)).toMatchObject({
      logradouro: 'Rua dos Pinheiros',
      uf: 'SP',
    })
  })

  it('grava o cep só com os dígitos e devolve no cadastro', async () => {
    const r = await criar({
      ...NOVO,
      nome: 'Com Cep',
      documento: '123.456.789-09',
      email: '',
      cep: ' 04538-132 ',
    })
    expect(r.status).toBe(201)
    expect((await corpo<Cadastro>(r)).cep).toBe('04538132')
  })

  it('recusa UF fora do formato (422 uf_invalida)', async () => {
    const r = await criar({ ...NOVO, nome: 'UF Errada', documento: '390.533.447-05', uf: 'São' })
    expect(r.status).toBe(422)
    expect(await corpo<Erro>(r)).toEqual({
      erro: { codigo: 'uf_invalida', mensagem: 'Informe a UF com 2 letras' },
    })
  })

  it('recusa cep malformado (422 cep_invalido)', async () => {
    const r = await criar({ ...NOVO, nome: 'Cep Errado', documento: '123.456.789-09', cep: '12' })
    expect(r.status).toBe(422)
    expect(await corpo<Erro>(r)).toMatchObject({
      erro: { codigo: 'cep_invalido', mensagem: 'Informe um CEP com 8 dígitos' },
    })
  })

  it('com e-mail, o cadastro já sai com o convite de acesso', async () => {
    const r = await criar({
      ...NOVO,
      nome: 'Paula Dias',
      documento: '935.411.347-80',
      email: ' Paula@Dias.com ',
    })
    expect(r.status).toBe(201)
    const criado = await corpo<Criado>(r)
    expect(criado.convite).toEqual({ situacao: 'enviado', email: 'paula@dias.com', mensagem: null })
    expect(caixa.enviados.map((e) => e.para)).toEqual(['paula@dias.com'])
    expect(criado.acesso).toBe('convidado')
  })

  it('sem e-mail, credencia sem convite', async () => {
    const r = await criar({ ...NOVO, nome: 'Sem Email', documento: '741.852.963-55', email: '' })
    expect(r.status).toBe(201)
    const criado = await corpo<Criado>(r)
    expect(criado.convite).toEqual({ situacao: 'sem_email', email: null, mensagem: null })
    expect(criado.acesso).toBe('sem_email')
    expect(caixa.enviados).toEqual([])
  })

  it('se o e-mail não sai, o cadastro fica e a resposta avisa', async () => {
    trocarCorreio({
      enviar: () => Promise.reject(new Error('SMTP fora do ar')),
    })
    const r = await criar({
      ...NOVO,
      nome: 'Rita Souza',
      documento: '862.057.194-01',
      email: 'rita@souza.com',
    })
    expect(r.status).toBe(201)
    const criado = await corpo<Criado>(r)
    expect(criado.convite).toEqual({
      situacao: 'falhou',
      email: 'rita@souza.com',
      mensagem: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
    })
    expect(criado.acesso).toBe('pendente')
    expect(await prisma.prestador.count({ where: { id: criado.id } })).toBe(1)
  })

  it('e-mail de outra conta: credencia e avisa que o convite não saiu', async () => {
    const r = await criar({
      ...NOVO,
      nome: 'Duplica Renata',
      documento: '503.162.487-62',
      email: GESTORA_DEV.email,
    })
    expect(r.status).toBe(201)
    expect((await corpo<Criado>(r)).convite).toEqual({
      situacao: 'falhou',
      email: GESTORA_DEV.email,
      mensagem: 'Este e-mail já é usado por outra conta',
    })
    expect(caixa.enviados).toEqual([])
  })

  it('a cor conta também os excluídos', async () => {
    await prisma.prestador.update({ where: { id: 'p5' }, data: { excluidoEm: new Date() } })
    const esperada = corDoPrestador(await prisma.prestador.count())
    const r = await criar({ ...NOVO, documento: '11.222.333/0001-81', email: '', regiao: '' })
    expect(r.status).toBe(201)
    expect(await corpo<Cadastro>(r)).toMatchObject({ cor: esperada, email: null, regiao: null })
  })

  it.each([
    [{ nome: '   ', documento: '', telefone: '' }, 'nome_obrigatorio', 'Informe o nome'],
    [{ documento: '123', telefone: '' }, 'documento_invalido', 'CPF ou CNPJ inválido'],
    [{ documento: '529.982.247-26' }, 'documento_invalido', 'CPF ou CNPJ inválido'],
    [{ documento: '000.000.000-00' }, 'documento_invalido', 'CPF ou CNPJ inválido'],
    [{ telefone: '91234-5678' }, 'telefone_invalido', 'Informe o telefone com DDD'],
    [{ especialidades: ['t1', 'nao-existe'] }, 'tipo_invalido', 'Tipo de demanda inválido'],
    [{ email: 'a@x.com; b@y.com' }, 'email_invalido', 'Informe um e-mail válido'],
  ])('recusa %j com 422 %s', async (troca, codigo, mensagem) => {
    const r = await criar({ ...NOVO, documento: '390.533.447-05', ...troca })
    expect(r.status).toBe(422)
    expect(await corpo<Erro>(r)).toEqual({ erro: { codigo, mensagem } })
  })

  it('documento de outro prestador não excluído: 409 com o nome dele', async () => {
    const r = await criar({ ...NOVO, nome: 'Outro', documento: '52998224725' })
    expect(r.status).toBe(409)
    expect(await corpo<Erro>(r)).toEqual({
      erro: { codigo: 'documento_duplicado', mensagem: 'Documento já cadastrado para Pedro Lima' },
    })
  })

  it('o documento de um prestador excluído pode ser credenciado de novo', async () => {
    const r1 = await criar({ ...NOVO, nome: 'Primeiro', documento: '111.444.777-35' })
    const primeiro = await corpo<Cadastro>(r1)
    await prisma.prestador.update({ where: { id: primeiro.id }, data: { excluidoEm: new Date() } })
    const r2 = await criar({ ...NOVO, nome: 'Segundo', documento: '11144477735' })
    expect(r2.status).toBe(201)
  })

  it('recusa campos fora do formato (422 de validação)', async () => {
    const r = await criar({ ...NOVO, especialidades: 't1' })
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro.codigo).toBe('validacao')
  })

  it('é só para a gestão', async () => {
    expect((await criar(NOVO, carlos)).status).toBe(403)
    expect((await app.request('/api/prestadores', json('POST', {}, NOVO))).status).toBe(401)
  })
})

describe('PATCH /api/prestadores/{id}', () => {
  beforeAll(preparar)

  it('edita um prestador do seed mantendo o documento (sem DV) e sem mexer em status, cor e data', async () => {
    const r = await editar('p1', {
      ...DADOS_CARLOS,
      nome: 'Carlos A. Mendes',
      documento: '318.402.117-50',
      telefone: '(11) 3456-7890',
      especialidades: ['t4', 't1'],
    })
    expect(r.status).toBe(200)
    expect(await corpo<Cadastro>(r)).toMatchObject({
      id: 'p1',
      nome: 'Carlos A. Mendes',
      documento: '31840211750',
      telefone: '1134567890',
      status: 'ativo',
      cor: '#0069BD',
      credenciadoDesde: '2024-03-12',
      especialidades: [
        { id: 't4', nome: 'Troca de disjuntor' },
        { id: 't1', nome: 'Vazamento' },
      ],
      emAberto: 8,
      total: 20,
    })
  })

  it('troca o cep na edição; sem cep no corpo, limpa', async () => {
    const editado = await corpo<Cadastro>(editar('p1', { ...DADOS_CARLOS, cep: '01310-200' }))
    expect(editado.cep).toBe('01310200')
    const limpo = await corpo<Cadastro>(editar('p1', DADOS_CARLOS))
    expect(limpo.cep).toBeNull()
  })

  it('troca o endereço na edição; sem ele no corpo, limpa', async () => {
    const endereco = {
      cep: '01310-200',
      logradouro: 'Avenida Paulista',
      numero: '1578',
      complemento: 'sala 3',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    }
    const editado = await corpo<Cadastro>(editar('p1', { ...DADOS_CARLOS, ...endereco }))
    expect(editado).toMatchObject({ ...endereco, cep: '01310200' })
    const limpo = await corpo<Cadastro>(editar('p1', DADOS_CARLOS))
    expect(limpo).toMatchObject({
      cep: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
    })
  })

  it('UF fora do formato na edição: 422 uf_invalida, sem gravar', async () => {
    const r = await editar('p2', {
      nome: 'Ana Ribeiro',
      documento: '27415903000144',
      telefone: '11971205588',
      especialidades: ['t1'],
      uf: 'S',
    })
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro.codigo).toBe('uf_invalida')
    expect((await prisma.prestador.findUniqueOrThrow({ where: { id: 'p2' } })).uf).toBe('SP')
  })

  it('a edição não muda o status de um inativo', async () => {
    const r = await editar('p5', {
      nome: 'Roberto Alves',
      documento: '21977438012',
      telefone: '11966770914',
      especialidades: [],
    })
    expect(r.status).toBe(200)
    expect(await corpo<Cadastro>(r)).toMatchObject({ status: 'inativo', especialidades: [] })
  })

  it('documento alterado passa pelo dígito verificador', async () => {
    const r = await editar('p1', { ...DADOS_CARLOS, documento: '219.774.380-13' })
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro.mensagem).toBe('CPF ou CNPJ inválido')
  })

  it('documento de outro prestador: 409', async () => {
    const r = await editar('p1', { ...DADOS_CARLOS, documento: '219.774.380-12' })
    expect(r.status).toBe(409)
    expect((await corpo<Erro>(r)).erro.mensagem).toBe('Documento já cadastrado para Roberto Alves')
  })

  it('404 para prestador inexistente ou excluído', async () => {
    expect((await editar('nao-existe', DADOS_CARLOS)).status).toBe(404)
    await prisma.prestador.update({ where: { id: 'p6' }, data: { excluidoEm: new Date() } })
    const r = await editar('p6', { ...DADOS_CARLOS, documento: '41206557000190' })
    expect(r.status).toBe(404)
    expect((await corpo<Erro>(r)).erro.mensagem).toBe('Prestador não encontrado')
  })

  it('é só para a gestão', async () => {
    expect((await editar('p1', DADOS_CARLOS, carlos)).status).toBe(403)
  })
})

describe('PATCH /api/prestadores/{id}: e-mail e login', () => {
  beforeEach(preparar)

  /** O corpo do PATCH com os dados atuais do cadastro, trocando o que o teste pedir. */
  async function comDados(id: string, troca: Record<string, unknown>) {
    const p = await prisma.prestador.findUniqueOrThrow({
      where: { id },
      include: { especialidades: { orderBy: { ordem: 'asc' } } },
    })
    return {
      nome: p.nome,
      documento: p.documento,
      telefone: p.telefone,
      email: p.email,
      regiao: p.regiao,
      especialidades: p.especialidades.map((e) => e.tipoId),
      ...troca,
    }
  }
  const tentarEntrar = (email: string) =>
    app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5174' },
      body: JSON.stringify({ email, password: SENHA_DEV }),
    })

  it('trocar o e-mail troca o login de quem já tem senha', async () => {
    const r = await editar('p1', await comDados('p1', { email: ' Carlos.Novo@Email.com ' }))
    expect(r.status).toBe(200)

    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })).toMatchObject({
      email: 'carlos.novo@email.com',
    })
    expect((await tentarEntrar('carlos.novo@email.com')).status).toBe(200)
    expect((await tentarEntrar(EMAIL_PRESTADOR_DEV)).status).toBe(401)
  })

  it('trocar o e-mail derruba o convite que foi para o endereço antigo', async () => {
    const convite = await app.request('/api/prestadores/p2/convite', {
      method: 'POST',
      headers: gestora,
    })
    expect(convite.status).toBe(200)

    const r = await editar('p2', await comDados('p2', { email: 'ana.nova@ribeiro.com.br' }))
    expect(r.status).toBe(200)
    expect(await corpo<Cadastro>(r)).toMatchObject({
      email: 'ana.nova@ribeiro.com.br',
      acesso: 'pendente',
    })
    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'u-p2' } })).toMatchObject({
      email: 'ana.nova@ribeiro.com.br',
    })
    expect(await prisma.verification.count({ where: { value: 'u-p2' } })).toBe(0)
  })

  it('manter o e-mail não mexe no login nem no convite', async () => {
    await app.request('/api/prestadores/p2/convite', { method: 'POST', headers: gestora })
    // O Carlos do seed entra com um e-mail diferente do cadastro: editar sem trocar o e-mail não
    // pode mudar o login dele.
    for (const id of ['p1', 'p2']) {
      const r = await editar(id, await comDados(id, { nome: 'Nome Editado' }))
      expect(r.status).toBe(200)
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })).email).toBe(
      EMAIL_PRESTADOR_DEV,
    )
    expect((await listar()).find((p) => p.id === 'p2')?.acesso).toBe('convidado')
  })

  it('e-mail de outra conta: 409 email_em_uso, sem mudar nada', async () => {
    for (const email of [GESTORA_DEV.email, 'CARLOS@russo.dev']) {
      const r = await editar('p2', await comDados('p2', { email, nome: 'Ana Trocada' }))
      expect(r.status).toBe(409)
      expect(await corpo<Erro>(r)).toEqual({
        erro: { codigo: 'email_em_uso', mensagem: 'Este e-mail já é usado por outra conta' },
      })
    }
    expect(await prisma.prestador.findUniqueOrThrow({ where: { id: 'p2' } })).toMatchObject({
      nome: 'Ana Ribeiro',
      email: 'ana@ribeiroreparos.com.br',
    })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: 'u-p2' } })).email).toBe(
      'ana@ribeiroreparos.com.br',
    )
  })

  it('sem usuário vinculado, o login fica como está', async () => {
    const criado = await corpo<Cadastro>(
      criar({ ...NOVO, nome: 'Sem Login', documento: '390.533.447-05', email: '' }),
    )
    const r = await editar(criado.id, await comDados(criado.id, { email: 'sem@login.com' }))
    expect(r.status).toBe(200)
    expect(await prisma.user.count({ where: { prestadorId: criado.id } })).toBe(0)
    const semEmail = await editar(criado.id, await comDados(criado.id, { email: '' }))
    expect(semEmail.status).toBe(200)
    expect(await prisma.user.count({ where: { prestadorId: criado.id } })).toBe(0)
  })

  it('remover o e-mail encerra o login: anônimo, sem sessões, convites nem senha', async () => {
    const convite = await app.request('/api/prestadores/p1/convite', {
      method: 'POST',
      headers: gestora,
    })
    expect(convite.status).toBe(200)
    expect((await app.request('/api/me', { headers: carlos })).status).toBe(200)

    const r = await editar('p1', await comDados('p1', { email: '' }))
    expect(r.status).toBe(200)
    expect(await corpo<Cadastro>(r)).toMatchObject({ email: null, acesso: 'sem_email' })

    // O cadastro e o login andam juntos: sem e-mail, o login é anonimizado como na exclusão.
    const anonimo = 'excluido+p1@invalido.local'
    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })).toMatchObject({
      email: anonimo,
      prestadorId: 'p1',
    })
    expect(await prisma.session.count({ where: { userId: 'u-p1' } })).toBe(0)
    expect(await prisma.verification.count({ where: { value: 'u-p1' } })).toBe(0)
    expect(await prisma.account.count({ where: { userId: 'u-p1' } })).toBe(0)
    expect((await app.request('/api/me', { headers: carlos })).status).toBe(401)
    expect((await tentarEntrar(EMAIL_PRESTADOR_DEV)).status).toBe(401)
    // O e-mail anônimo é previsível: a senha antiga não pode abrir o login com ele.
    expect((await tentarEntrar(anonimo)).status).toBe(401)
  })

  it('depois de remover o e-mail, o acesso volta com um e-mail novo e um novo convite', async () => {
    expect((await editar('p1', await comDados('p1', { email: '' }))).status).toBe(200)

    const r = await editar('p1', await comDados('p1', { email: 'carlos.volta@email.com' }))
    expect(r.status).toBe(200)
    expect((await corpo<Cadastro>(r)).acesso).toBe('pendente')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })).email).toBe(
      'carlos.volta@email.com',
    )
    expect((await tentarEntrar('carlos.volta@email.com')).status).toBe(401)

    const convite = await app.request('/api/prestadores/p1/convite', {
      method: 'POST',
      headers: gestora,
    })
    expect(convite.status).toBe(200)
    const token = /\/convite\?token=([\w%-]+)/.exec(caixa.enviados.at(-1)?.texto ?? '')?.[1] ?? ''
    const senha = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5174' },
      body: JSON.stringify({
        newPassword: 'senha-nova-do-carlos',
        token: decodeURIComponent(token),
      }),
    })
    expect(senha.status).toBe(200)
    const novoLogin = await entrar(app, 'carlos.volta@email.com', 'senha-nova-do-carlos')
    expect((await app.request('/api/me', { headers: novoLogin })).status).toBe(200)
    expect((await listar()).find((p) => p.id === 'p1')?.acesso).toBe('ativo')
  })
})

describe('PATCH /api/prestadores/{id}/status', () => {
  beforeAll(preparar)

  it('desativa e reativa, e o seletor do Novo acionamento acompanha', async () => {
    const r = await mudarStatus('p4', 'inativo')
    expect(r.status).toBe(200)
    expect(await corpo<Cadastro>(r)).toMatchObject({ id: 'p4', status: 'inativo', emAberto: 1 })
    const ativos = await corpo<{ id: string }[]>(
      app.request('/api/prestadores', { headers: gestora }),
    )
    expect(ativos.map((p) => p.id)).not.toContain('p4')
    expect(await corpo<Cadastro>(mudarStatus('p4', 'ativo'))).toMatchObject({ status: 'ativo' })
  })

  it('recusa status desconhecido e prestador excluído', async () => {
    expect((await mudarStatus('p4', 'pausado')).status).toBe(422)
    await prisma.prestador.update({ where: { id: 'p6' }, data: { excluidoEm: new Date() } })
    expect((await mudarStatus('p6', 'ativo')).status).toBe(404)
  })

  it('é só para a gestão', async () => {
    expect((await mudarStatus('p4', 'inativo', carlos)).status).toBe(403)
  })
})

describe('DELETE /api/prestadores/{id}', () => {
  beforeAll(preparar)

  it('com acionamentos em aberto: 409 com a mensagem de bloqueio, sem excluir', async () => {
    const r = await excluir('p1')
    expect(r.status).toBe(409)
    expect(await corpo<Erro>(r)).toEqual({
      erro: {
        codigo: 'prestador_com_acionamentos',
        mensagem: mensagemBloqueio('Carlos Mendes', 8),
      },
    })
    const p1 = await prisma.prestador.findUniqueOrThrow({ where: { id: 'p1' } })
    expect([p1.excluidoEm, p1.status]).toEqual([null, 'ativo'])
  })

  it('sem nada em aberto: exclui, desativa e derruba a sessão do prestador', async () => {
    const email = await loginDePrestador('p6')
    const luciana = await entrar(app, email)
    expect((await app.request('/api/me', { headers: luciana })).status).toBe(200)

    const r = await excluir('p6')
    expect(r.status).toBe(200)
    expect(await corpo(r)).toEqual({ ok: true })

    const p6 = await prisma.prestador.findUniqueOrThrow({ where: { id: 'p6' } })
    expect(p6.excluidoEm).not.toBeNull()
    expect(p6.status).toBe('inativo')
    expect(await prisma.session.count({ where: { user: { prestadorId: 'p6' } } })).toBe(0)
    expect(await prisma.account.count({ where: { user: { prestadorId: 'p6' } } })).toBe(0)
    expect((await app.request('/api/me', { headers: luciana })).status).toBe(401)
    expect((await listar()).map((p) => p.id)).not.toContain('p6')
    expect((await excluir('p6')).status).toBe(404)
  })

  it('libera o e-mail e apaga o convite: recredenciar com o mesmo e-mail volta a convidar', async () => {
    const dados = { ...NOVO, nome: 'Vera Lins', email: 'vera@lins.com' }
    const antigo = await corpo<Criado>(criar(dados))
    expect(antigo.convite.situacao).toBe('enviado')
    const linkAntigo = /\/convite\?token=([\w%-]+)/.exec(caixa.enviados[0].texto)?.[1] ?? ''
    const usuarioAntigo = await prisma.user.findUniqueOrThrow({
      where: { prestadorId: antigo.id },
    })

    expect((await excluir(antigo.id)).status).toBe(200)

    // O usuário fica (os eventos do acionamento apontam para ele), com o e-mail anonimizado.
    expect(await prisma.user.findUniqueOrThrow({ where: { id: usuarioAntigo.id } })).toMatchObject({
      email: `excluido+${antigo.id}@invalido.local`,
      prestadorId: antigo.id,
    })
    expect(await prisma.verification.count({ where: { value: usuarioAntigo.id } })).toBe(0)
    const reuso = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5174' },
      body: JSON.stringify({
        newPassword: 'senha-da-vera-1',
        token: decodeURIComponent(linkAntigo),
      }),
    })
    expect(reuso.status).toBe(400)

    const r = await criar(dados)
    expect(r.status).toBe(201)
    const novo = await corpo<Criado>(r)
    expect(novo.convite).toEqual({ situacao: 'enviado', email: 'vera@lins.com', mensagem: null })
    expect(novo.acesso).toBe('convidado')
    expect(await prisma.user.findUniqueOrThrow({ where: { prestadorId: novo.id } })).toMatchObject({
      email: 'vera@lins.com',
    })
  })

  it('404 para prestador inexistente', async () => {
    expect((await excluir('nao-existe')).status).toBe(404)
  })

  it('é só para a gestão', async () => {
    expect((await excluir('p5', carlos)).status).toBe(403)
    expect((await app.request('/api/prestadores/p5', { method: 'DELETE' })).status).toBe(401)
  })
})

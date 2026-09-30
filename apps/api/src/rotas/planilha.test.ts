import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear, SENHA_DEV } from '@kgb/db/seed'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { corpo, hojeSP } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'
import { corDoPrestador } from '../dominio/documentos'
import { CABECALHO_PLANILHA, LINHA_MODELO, nomeDaExportacao } from '../dominio/planilha'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

async function preparar() {
  await semear(prisma)
  await prisma.importacaoPlanilha.deleteMany()
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
}
beforeAll(preparar)
afterAll(async () => {
  await prisma.importacaoPlanilha.deleteMany()
  await semear(prisma)
})

interface Previa {
  linhas: {
    nome: string
    documento: string
    especialidades: string[]
    especialidadesIgnoradas: string[]
    acao: 'novo' | 'atualizar' | 'erro'
    selo: string
  }[]
  resumo: { novos: number; atualizados: number; erros: number }
  ausentes: { id: string; nome: string }[]
  novosComEmail: number
}
interface Erro {
  erro: { codigo: string; mensagem: string }
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const BOM = '﻿'

/** A planilha de exemplo dos casos visuais, com Roberto reativado e datas para conferir. */
const CSV = `${BOM}Nome,CPF/CNPJ,Telefone,E-mail,Região,Especialidades,Status,Credenciado desde
Carlos Mendes,318.402.117-50,(11) 98734-0000,carlos@novo.com,Zona Sul,"Vazamento; Revisão elétrica; Ponto de luz",Ativo,01/02/2024
Ana Ribeiro,27.415.903/0001-44,(11) 97120-5588,,,"Pintura; Reparo em gesso",Ativo,
Pedro Lima,529.982.247-25,(11) 91234-5678,pedro.lima@email.com,Centro,"Vazamento; Chaveiro",Ativo,
Fernanda Souza,11.222.333/0001-81,(11) 3456-7890,contato@fsouza.com.br,Zona Norte,"limpeza de ar condicionado; Jardinagem",Inativo,15/01/2024
Roberto Alves,219.774.380-12,(11) 96677-0914,roberto.alves@email.com,Zona Norte,"Chaveiro; Pintura",,
,111.444.777-35,(11) 90000-1111,,,Pintura,Ativo,
Bruno Castro,123.456.789,(11) 94444-2222,,Centro,Vazamento,Ativo,
Carlos M.,318.402.117-50,(11) 98734-2210,,,Vazamento,Ativo,
`
const SO_ERROS = `${BOM}Nome,CPF/CNPJ,Telefone\n,318.402.117-50,(11) 98734-2210\nBruno Castro,123,(11) 94444-2222\n`

function formulario(
  conteudo: string | Uint8Array<ArrayBuffer> | null,
  campos: Record<string, string> = {},
  nome = 'credenciados.csv',
) {
  const f = new FormData()
  if (conteudo !== null) f.set('arquivo', new File([conteudo], nome))
  for (const [chave, valor] of Object.entries(campos)) f.set(chave, valor)
  return f
}
const previa = (conteudo: string | Uint8Array<ArrayBuffer> | null, headers = gestora) =>
  app.request('/api/prestadores/planilha/previa', {
    method: 'POST',
    headers,
    body: formulario(conteudo),
  })
const importar = (
  conteudo: string | Uint8Array<ArrayBuffer> | null,
  campos: Record<string, string> = {},
  headers = gestora,
) =>
  app.request('/api/prestadores/planilha/importacao', {
    method: 'POST',
    headers,
    body: formulario(conteudo, campos),
  })

const prestadorPorDocumento = (documento: string) =>
  prisma.prestador.findFirstOrThrow({
    where: { documento, excluidoEm: null },
    include: { especialidades: { orderBy: { ordem: 'asc' } } },
  })
const dataIso = (d: Date) => d.toISOString().slice(0, 10)

async function lerXlsx(r: Response) {
  const livro = XLSX.read(new Uint8Array(await r.arrayBuffer()), {
    type: 'buffer',
    cellStyles: true,
  })
  const aba = livro.Sheets[livro.SheetNames[0]!]!
  return {
    livro,
    aba,
    linhas: XLSX.utils.sheet_to_json<string[]>(aba, { header: 1, defval: null }),
  }
}

describe('POST /api/prestadores/planilha/previa', () => {
  it('mostra os selos, o resumo e os ausentes, sem gravar nada', async () => {
    const antes = await prisma.prestador.count()
    const r = await previa(CSV)
    expect(r.status).toBe(200)
    const p = await corpo<Previa>(r)
    expect(p.linhas.map((l) => [l.nome, l.selo])).toEqual([
      ['Carlos Mendes', 'Atualizar'],
      ['Ana Ribeiro', 'Atualizar'],
      ['Pedro Lima', 'Novo'],
      ['Fernanda Souza', 'Novo'],
      ['Roberto Alves', 'Atualizar'],
      ['', 'Sem nome'],
      ['Bruno Castro', 'Documento inválido'],
      ['Carlos M.', 'Duplicado na planilha'],
    ])
    expect(p.linhas[3]).toEqual({
      nome: 'Fernanda Souza',
      documento: '11.222.333/0001-81',
      especialidades: ['limpeza de ar condicionado', 'Jardinagem'],
      especialidadesIgnoradas: ['Jardinagem'],
      acao: 'novo',
      selo: 'Novo',
    })
    expect(p.resumo).toEqual({ novos: 2, atualizados: 3, erros: 3 })
    expect(p.novosComEmail).toBe(2)
    expect(p.ausentes.map((a) => a.nome)).toEqual(['João Pires', 'Marina Costa', 'Luciana Prado'])
    expect(await prisma.prestador.count()).toBe(antes)
    expect((await prestadorPorDocumento('31840211750')).telefone).toBe('11987342210')
    expect(await prisma.importacaoPlanilha.count()).toBe(0)
  })

  it('sem arquivo: 422', async () => {
    const r = await previa(null)
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro).toEqual({
      codigo: 'arquivo_obrigatorio',
      mensagem: 'Envie o arquivo da planilha',
    })
  })

  it('só o cabeçalho: "Não encontramos linhas na planilha"', async () => {
    const r = await previa(`${BOM}Nome,CPF/CNPJ\n`)
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro).toEqual({
      codigo: 'planilha_vazia',
      mensagem: 'Não encontramos linhas na planilha',
    })
  })

  it('arquivo que não abre: "Não foi possível ler o arquivo"', async () => {
    const r = await previa(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]))
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro.mensagem).toBe('Não foi possível ler o arquivo')
  })

  it('acima de 5 MB: 413', async () => {
    for (const tamanho of [5 * 1024 * 1024 + 1, 6 * 1024 * 1024]) {
      const r = await previa(new Uint8Array(tamanho).fill(0x61))
      expect(r.status).toBe(413)
      expect((await corpo<Erro>(r)).erro).toEqual({
        codigo: 'planilha_grande',
        mensagem: 'A planilha passa de 5 MB',
      })
    }
  })

  it('só gestor', async () => {
    expect((await previa(CSV, carlos)).status).toBe(403)
    expect((await previa(CSV, {})).status).toBe(401)
  })
})

describe('POST /api/prestadores/planilha/importacao', () => {
  beforeEach(preparar)

  it('aplica as linhas válidas numa transação e grava a auditoria', async () => {
    const r = await importar(CSV)
    expect(r.status).toBe(200)
    expect(await corpo(r)).toEqual({ novos: 2, atualizados: 3, desativados: 0 })

    const pedro = await prestadorPorDocumento('52998224725')
    expect(pedro).toMatchObject({
      nome: 'Pedro Lima',
      telefone: '11912345678',
      email: 'pedro.lima@email.com',
      regiao: 'Centro',
      status: 'ativo',
      cor: corDoPrestador(6),
    })
    expect(dataIso(pedro.credenciadoDesde)).toBe(hojeSP())
    expect(pedro.especialidades.map((e) => e.tipoId)).toEqual(['t1', 't8'])

    const fernanda = await prestadorPorDocumento('11222333000181')
    expect(fernanda).toMatchObject({ status: 'inativo', cor: corDoPrestador(7) })
    expect(dataIso(fernanda.credenciadoDesde)).toBe('2024-01-15')
    expect(fernanda.especialidades.map((e) => e.tipoId)).toEqual(['t7'])

    const carlosAtualizado = await prestadorPorDocumento('31840211750')
    expect(carlosAtualizado).toMatchObject({
      nome: 'Carlos Mendes',
      telefone: '11987340000',
      email: 'carlos@novo.com',
      regiao: 'Zona Sul',
      cor: '#0069BD',
      // A planilha não tem as colunas de CEP e endereço: os gravados ficam como estão.
      cep: '05422001',
      logradouro: 'Rua dos Pinheiros',
      numero: '812',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(dataIso(carlosAtualizado.credenciadoDesde)).toBe('2024-02-01')
    expect(carlosAtualizado.especialidades.map((e) => e.tipoId)).toEqual(['t1', 't2', 't3'])

    const ana = await prestadorPorDocumento('27415903000144')
    expect(ana).toMatchObject({ email: null, regiao: null })
    expect(dataIso(ana.credenciadoDesde)).toBe('2024-06-03')

    expect((await prestadorPorDocumento('21977438012')).status).toBe('ativo')
    expect((await prestadorPorDocumento('40211896531')).status).toBe('ativo')

    const auditoria = await prisma.importacaoPlanilha.findMany()
    expect(auditoria).toEqual([
      expect.objectContaining({
        autorId: GESTORA_DEV.id,
        autorNome: GESTORA_DEV.nome,
        arquivo: 'credenciados.csv',
        novos: 2,
        atualizados: 3,
        desativados: 0,
        ignorados: 3,
      }),
    ])
  })

  it('com "Desativar quem não está na planilha", os ausentes ficam inativos', async () => {
    const r = await importar(CSV, { desativarAusentes: 'true' })
    expect(await corpo(r)).toEqual({ novos: 2, atualizados: 3, desativados: 3 })
    const inativos = await prisma.prestador.findMany({
      where: { id: { in: ['p3', 'p4', 'p6'] } },
      select: { status: true },
    })
    expect(inativos.map((p) => p.status)).toEqual(['inativo', 'inativo', 'inativo'])
    expect((await prisma.importacaoPlanilha.findFirstOrThrow()).desativados).toBe(3)
  })

  it('sem linha válida: 422 e nada gravado', async () => {
    const antes = await prisma.prestador.count()
    const r = await importar(SO_ERROS, { desativarAusentes: 'true' })
    expect(r.status).toBe(422)
    expect((await corpo<Erro>(r)).erro.codigo).toBe('planilha_sem_validas')
    expect(await prisma.prestador.count()).toBe(antes)
    expect(await prisma.prestador.count({ where: { status: 'inativo' } })).toBe(1)
    expect(await prisma.importacaoPlanilha.count()).toBe(0)
  })

  it('documento de um prestador excluído entra como Novo e cria outro registro', async () => {
    expect(
      (await app.request('/api/prestadores/p6', { method: 'DELETE', headers: gestora })).status,
    ).toBe(200)
    const csv = `${BOM}Nome,CPF/CNPJ,Telefone\nLuciana Prado,41.206.557/0001-90,(11) 95512-7780\n`
    expect((await corpo<Previa>(await previa(csv))).linhas[0]!.selo).toBe('Documento inválido')
    // O CNPJ do seed tem dígito verificador inválido: como é Novo, a regra do DV vale.
    const valido = `${BOM}Nome,CPF/CNPJ,Telefone\nLuciana Prado,11.222.333/0001-81,(11) 95512-7780\n`
    await prisma.prestador.update({ where: { id: 'p6' }, data: { documento: '11222333000181' } })
    expect((await corpo<Previa>(await previa(valido))).linhas[0]!.selo).toBe('Novo')
    expect(await corpo(await importar(valido))).toEqual({
      novos: 1,
      atualizados: 0,
      desativados: 0,
    })
    expect(await prisma.prestador.count({ where: { documento: '11222333000181' } })).toBe(2)
  })

  it('especialidade de um tipo excluído não é reconhecida', async () => {
    await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { excluidoEm: new Date() } })
    const pedroNaPrevia = (await corpo<Previa>(await previa(CSV))).linhas[2]!
    expect(pedroNaPrevia).toMatchObject({
      nome: 'Pedro Lima',
      especialidades: ['Vazamento', 'Chaveiro'],
      especialidadesIgnoradas: ['Chaveiro'],
    })
    await importar(CSV)
    expect(
      (await prestadorPorDocumento('52998224725')).especialidades.map((e) => e.tipoId),
    ).toEqual(['t1'])
  })

  describe('o login acompanha o e-mail, com a regra do Editar', () => {
    const tentarEntrar = (email: string) =>
      app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:5174' },
        body: JSON.stringify({ email, password: SENHA_DEV }),
      })
    const login = async (prestadorId: string) =>
      (await prisma.user.findUniqueOrThrow({ where: { prestadorId } })).email

    it('Atualizar que troca o e-mail troca o login e derruba o convite pendente', async () => {
      await prisma.verification.create({
        data: {
          id: 'v-convite-da-ana',
          identifier: 'reset-password-sha256:convite-da-ana',
          value: 'u-p2',
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      })
      const csv = `${BOM}Nome,CPF/CNPJ,Telefone,E-mail
Carlos Mendes,318.402.117-50,(11) 98734-2210, Carlos@Novo.com
Ana Ribeiro,27.415.903/0001-44,(11) 97120-5588,ana.nova@ribeiro.com.br
`
      expect(await corpo(await importar(csv))).toEqual({
        novos: 0,
        atualizados: 2,
        desativados: 0,
      })
      expect(await login('p1')).toBe('carlos@novo.com')
      expect((await tentarEntrar('carlos@novo.com')).status).toBe(200)
      expect((await tentarEntrar(EMAIL_PRESTADOR_DEV)).status).toBe(401)
      expect(await login('p2')).toBe('ana.nova@ribeiro.com.br')
      expect(await prisma.verification.count({ where: { value: 'u-p2' } })).toBe(0)
    })

    it('e-mail de outra conta: "E-mail em uso" na prévia, e a linha fica de fora', async () => {
      const csv = `${BOM}Nome,CPF/CNPJ,Telefone,E-mail
Ana Ribeiro,27.415.903/0001-44,(11) 97120-5588,renata@russo.dev
João Pires,402.118.965-31,(11) 99402-1876,CARLOS@russo.dev
Marina Costa,35.882.610/0001-07,(11) 98851-3302,mesma@email.com
Roberto Alves,219.774.380-12,(11) 96677-0914,Mesma@Email.com
`
      const p = await corpo<Previa>(await previa(csv))
      expect(p.linhas.map((l) => [l.nome, l.selo, l.acao])).toEqual([
        ['Ana Ribeiro', 'E-mail em uso', 'erro'],
        ['João Pires', 'E-mail em uso', 'erro'],
        ['Marina Costa', 'Atualizar', 'atualizar'],
        ['Roberto Alves', 'E-mail em uso', 'erro'],
      ])
      expect(p.resumo).toEqual({ novos: 0, atualizados: 1, erros: 3 })

      expect(await corpo(await importar(csv))).toEqual({
        novos: 0,
        atualizados: 1,
        desativados: 0,
      })
      expect((await prestadorPorDocumento('27415903000144')).email).toBe(
        'ana@ribeiroreparos.com.br',
      )
      expect(await login('p2')).toBe('ana@ribeiroreparos.com.br')
      expect(await login('p3')).toBe('joao.pires@email.com')
      expect((await prestadorPorDocumento('35882610000107')).email).toBe('mesma@email.com')
      expect(await login('p4')).toBe('mesma@email.com')
      expect(await login('p5')).toBe('roberto.alves@email.com')
    })

    it('Atualizar que tira o e-mail encerra o login', async () => {
      const csv = `${BOM}Nome,CPF/CNPJ,Telefone,E-mail\nCarlos Mendes,318.402.117-50,(11) 98734-2210,\n`
      expect((await importar(csv)).status).toBe(200)
      expect((await prestadorPorDocumento('31840211750')).email).toBeNull()
      expect(await login('p1')).toBe('excluido+p1@invalido.local')
      expect(await prisma.account.count({ where: { userId: 'u-p1' } })).toBe(0)
      expect((await app.request('/api/me', { headers: carlos })).status).toBe(401)
    })
  })

  it('só gestor', async () => {
    expect((await importar(CSV, {}, carlos)).status).toBe(403)
    expect((await importar(CSV, {}, {})).status).toBe(401)
    expect(await prisma.importacaoPlanilha.count()).toBe(0)
  })
})

describe('GET /api/prestadores/planilha', () => {
  beforeAll(preparar)

  it('baixa os não excluídos na ordem de cadastro, formatados', async () => {
    await app.request('/api/prestadores/p6', { method: 'DELETE', headers: gestora })
    const r = await app.request('/api/prestadores/planilha', { headers: gestora })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe(XLSX_MIME)
    expect(r.headers.get('content-disposition')).toBe(
      `attachment; filename="${nomeDaExportacao(hojeSP())}"`,
    )
    const { livro, aba, linhas } = await lerXlsx(r)
    expect(livro.SheetNames).toEqual(['Credenciados'])
    expect(linhas[0]).toEqual([...CABECALHO_PLANILHA])
    expect(linhas.slice(1).map((l) => l[0])).toEqual([
      'Carlos Mendes',
      'Ana Ribeiro',
      'João Pires',
      'Marina Costa',
      'Roberto Alves',
    ])
    expect(linhas[1]).toEqual([
      'Carlos Mendes',
      '318.402.117-50',
      '(11) 98734-2210',
      'carlos.mendes@email.com',
      'Zona Oeste',
      'Vazamento; Revisão elétrica; Ponto de luz; Troca de disjuntor',
      'Ativo',
      '12/03/2024',
    ])
    expect(linhas[5]![6]).toBe('Inativo')
    expect(aba['!cols']?.map((c) => c.wch)).toEqual([26, 20, 16, 30, 14, 44, 10, 16])
  })

  it('só gestor', async () => {
    expect((await app.request('/api/prestadores/planilha', { headers: carlos })).status).toBe(403)
    expect((await app.request('/api/prestadores/planilha')).status).toBe(401)
  })
})

describe('GET /api/prestadores/planilha/modelo', () => {
  it('baixa o cabeçalho e a linha de exemplo', async () => {
    const r = await app.request('/api/prestadores/planilha/modelo', { headers: gestora })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe(XLSX_MIME)
    expect(r.headers.get('content-disposition')).toBe(
      'attachment; filename="modelo-credenciados-russo.xlsx"',
    )
    const { linhas } = await lerXlsx(r)
    expect(linhas).toEqual([[...CABECALHO_PLANILHA], LINHA_MODELO])
  })

  it('só gestor', async () => {
    const caminho = '/api/prestadores/planilha/modelo'
    expect((await app.request(caminho, { headers: carlos })).status).toBe(403)
    expect((await app.request(caminho)).status).toBe(401)
  })
})

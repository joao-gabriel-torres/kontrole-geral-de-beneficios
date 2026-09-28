import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, SENHA_DEV, semear } from '@kgb/db/seed'
import { hashPassword } from 'better-auth/crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

const app = criarApp()
const EMAIL_SEM_VINCULO = 'sem-vinculo@russo.dev'

// Outros arquivos de teste criam acionamentos: este recria o seed para contar sobre os dados originais.
beforeAll(async () => {
  await semear(prisma)
  await prisma.user.deleteMany({ where: { email: EMAIL_SEM_VINCULO } })
  await prisma.user.create({
    data: {
      id: 'u-sem-vinculo',
      name: 'Sem Vínculo',
      email: EMAIL_SEM_VINCULO,
      role: 'prestador',
      accounts: {
        create: {
          id: 'conta-sem-vinculo',
          accountId: 'u-sem-vinculo',
          providerId: 'credential',
          password: await hashPassword(SENHA_DEV),
        },
      },
    },
  })
})

describe('GET /api/acionamentos/contagem', () => {
  it('exige login', async () => {
    expect((await app.request('/api/acionamentos/contagem')).status).toBe(401)
  })

  it('conta todos os acionamentos para a gestora', async () => {
    const r = await app.request('/api/acionamentos/contagem', {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(200)
    const corpo = (await r.json()) as Record<string, number>
    expect(corpo).toMatchObject({ aberto: 7, em_andamento: 1, aguardando: 3, reprovado: 2 })
    expect(corpo.aprovado).toBeGreaterThanOrEqual(8)
  })

  it('conta só os acionamentos do prestador logado', async () => {
    const r = await app.request('/api/acionamentos/contagem', {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    const corpo = (await r.json()) as Record<string, number>
    expect(corpo).toMatchObject({ aberto: 5, em_andamento: 0, aguardando: 2, reprovado: 1 })
    expect(corpo.aprovado).toBeGreaterThanOrEqual(4)
  })

  it('prestador sem cadastro vinculado não enxerga nenhum acionamento', async () => {
    const r = await app.request('/api/acionamentos/contagem', {
      headers: await entrar(app, EMAIL_SEM_VINCULO),
    })
    expect(await r.json()).toEqual({
      aberto: 0,
      em_andamento: 0,
      aguardando: 0,
      reprovado: 0,
      aprovado: 0,
    })
  })
})

interface Resumo {
  id: string
  codigo: string
  titulo: string
  cliente: string
  data: string
  inicio: string
  status: string
  inviavel: boolean
  prestador: { id: string; nome: string }
  tipos: { nome: string; cor: string }[]
  etapas: { feitas: number; total: number }
  ultimoEnvioEm: string | null
}

async function listar(headers: Record<string, string>, consulta = '') {
  const r = await app.request(`/api/acionamentos${consulta}`, { headers })
  expect(r.status).toBe(200)
  return (await r.json()) as Resumo[]
}

describe('GET /api/acionamentos', () => {
  it('lista tudo para a gestora, do mais recente para o mais antigo', async () => {
    const lista = await listar(await entrar(app, GESTORA_DEV.email))
    expect(lista).toHaveLength(await prisma.acionamento.count())
    const chaves = lista.map((a) => a.data + a.inicio)
    expect(chaves).toEqual([...chaves].sort().reverse())
    const gesso = lista.find((a) => a.titulo === 'Reparo em gesso no quarto')!
    expect(gesso).toMatchObject({
      codigo: expect.stringMatching(/^AC-\d+$/),
      status: 'reprovado',
      prestador: { id: 'p1', nome: 'Carlos Mendes' },
      tipos: [{ nome: 'Reparo em gesso', cor: '#E0A100' }],
      etapas: { feitas: 4, total: 4 },
    })
    expect(gesso.ultimoEnvioEm).not.toBeNull()
  })

  it('filtra por status, com "finalizados" = aprovados', async () => {
    const headers = await entrar(app, GESTORA_DEV.email)
    expect(await listar(headers, '?status=aguardando')).toHaveLength(3)
    const finalizados = await listar(headers, '?status=finalizados')
    expect(finalizados.length).toBeGreaterThanOrEqual(8)
    expect(finalizados.every((a) => a.status === 'aprovado')).toBe(true)
  })

  it('busca por título, cliente, código e prestador, sem ligar para acentos e maiúsculas', async () => {
    const headers = await entrar(app, GESTORA_DEV.email)
    expect((await listar(headers, '?busca=residencia%20martins')).map((a) => a.titulo)).toEqual([
      'Reparo em gesso no quarto',
    ])
    const [umQualquer] = await listar(headers)
    expect(
      (await listar(headers, `?busca=${umQualquer!.codigo.toLowerCase()}`)).map((a) => a.id),
    ).toContain(umQualquer!.id)
    expect(
      (await listar(headers, '?busca=ANA%20RIBEIRO')).every(
        (a) => a.prestador.nome === 'Ana Ribeiro',
      ),
    ).toBe(true)
  })

  it('o prestador só vê os seus', async () => {
    const lista = await listar(await entrar(app, EMAIL_PRESTADOR_DEV))
    expect(lista.length).toBeGreaterThan(0)
    expect(lista.every((a) => a.prestador.id === 'p1')).toBe(true)
  })

  it('prestador sem vínculo recebe lista vazia', async () => {
    expect(await listar(await entrar(app, EMAIL_SEM_VINCULO))).toEqual([])
  })
})

describe('GET /api/acionamentos/:id', () => {
  async function idPorTitulo(titulo: string) {
    return (await prisma.acionamento.findFirstOrThrow({ where: { titulo } })).id
  }

  it('traz etapas, fotos de exemplo, inviabilidade e a linha do tempo', async () => {
    const id = await idPorTitulo('Ponto de luz na garagem')
    const r = await app.request(`/api/acionamentos/${id}`, {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d).toMatchObject({
      status: 'aprovado',
      inviavel: true,
      regras: { photoMin: 1, requireAllSteps: false },
      inviabilidade: { comentario: expect.stringMatching(/laje protendida/) },
    })
    expect(d.inviabilidade.fotos[0]).toMatchObject({
      url: null,
      cor: expect.stringMatching(/^#/),
      horario: expect.stringMatching(/^\d\d:\d\d$/),
    })
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual([
      'criado',
      'iniciado',
      'inviabilidade_enviada',
      'aprovado',
    ])
    expect(d.demandas[0].etapas[0]).toMatchObject({ texto: 'Desligar circuito', feita: true })
  })

  it('traz as revisões com motivo', async () => {
    const id = await idPorTitulo('Reparo no forro da sala')
    const d = await (
      await app.request(`/api/acionamentos/${id}`, {
        headers: await entrar(app, GESTORA_DEV.email),
      })
    ).json()
    expect(d.revisoes.map((r: { decisao: string }) => r.decisao)).toEqual(['reprovado', 'aprovado'])
    expect(d.eventos.find((e: { tipo: string }) => e.tipo === 'reprovado').motivo).toMatch(
      /retoque/,
    )
  })

  it('acionamento de outro prestador é 404 para o prestador', async () => {
    const id = await idPorTitulo('Reparo no forro da sala')
    const r = await app.request(`/api/acionamentos/${id}`, {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    expect(r.status).toBe(404)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'nao_encontrado' } })
  })

  it('id inexistente é 404', async () => {
    const r = await app.request('/api/acionamentos/nao-existe', {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(404)
  })
})

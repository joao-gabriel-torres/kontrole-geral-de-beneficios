import { semear } from '@kgb/db/seed'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarCorreioEmMemoria, trocarCorreio, type CorreioEmMemoria } from '../correio'
import { prisma } from '../db'
import { env } from '../env'
import { acessosDosPrestadores, enviarConvite, ErroEnvioConvite } from './convites'

const GESTOR = { papel: 'gestor' } as const
const DIA = 24 * 60 * 60 * 1000
let caixa: CorreioEmMemoria
let documentos = 0

beforeAll(() => semear(prisma))
afterAll(async () => {
  trocarCorreio(null)
  await semear(prisma)
})
beforeEach(() => {
  caixa = criarCorreioEmMemoria()
  trocarCorreio(caixa)
})

async function novoPrestador(
  id: string,
  dados: { nome?: string; email?: string | null; excluidoEm?: Date | null } = {},
) {
  documentos += 1
  await prisma.prestador.create({
    data: {
      id,
      nome: dados.nome ?? `Prestador ${id}`,
      documento: String(90000000000 + documentos),
      telefone: '11900000000',
      email: dados.email === undefined ? `${id}@teste.dev` : dados.email,
      credenciadoDesde: new Date('2024-01-01'),
      cor: '#0069BD',
      excluidoEm: dados.excluidoEm ?? null,
    },
  })
}

const convitesDoUsuario = (userId: string) =>
  prisma.verification.findMany({
    where: { value: userId, identifier: { startsWith: 'reset-password:' } },
  })

/** Token do link do e-mail (texto puro). */
function tokenDoEmail(texto: string): string {
  const link = /https?:\/\/\S+/.exec(texto)?.[0]
  const token = link ? new URL(link).searchParams.get('token') : null
  if (!token) throw new Error(`e-mail sem link de convite: ${texto}`)
  return token
}

describe('enviarConvite', () => {
  it('cria o usuário do prestador sem senha, grava um convite de 7 dias e manda o e-mail', async () => {
    await novoPrestador('p-conv-novo', {
      nome: 'Novo Prestador Silva',
      email: '  Novo.Prestador@Teste.DEV ',
    })
    const agora = new Date()

    const resultado = await enviarConvite('p-conv-novo', GESTOR, agora)

    expect(resultado).toEqual({
      email: 'novo.prestador@teste.dev',
      expiraEm: new Date(agora.getTime() + 7 * DIA).toISOString(),
    })
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { prestadorId: 'p-conv-novo' },
      include: { accounts: true },
    })
    expect(usuario).toMatchObject({
      name: 'Novo Prestador Silva',
      email: 'novo.prestador@teste.dev',
      role: 'prestador',
    })
    expect(usuario.accounts).toEqual([])

    expect(caixa.enviados).toHaveLength(1)
    const [email] = caixa.enviados
    expect(email.para).toBe('novo.prestador@teste.dev')
    expect(email.assunto).toBe('Seu acesso ao app da Russo Assistência')
    expect(email.texto).toMatch(/^Olá, Novo!/)
    expect(email.texto).toContain(`${env.URL_APP_PRESTADOR.replace(/\/+$/, '')}/convite?token=`)

    const convites = await convitesDoUsuario(usuario.id)
    expect(convites).toHaveLength(1)
    expect(convites[0].identifier).toBe(`reset-password:${tokenDoEmail(email.texto)}`)
    expect(convites[0].expiresAt.getTime()).toBe(agora.getTime() + 7 * DIA)
  })

  it('atualiza nome e e-mail do usuário que o prestador já tem', async () => {
    await prisma.prestador.update({
      where: { id: 'p2' },
      data: { nome: 'Ana Ribeiro Costa', email: 'Ana.Nova@Teste.dev' },
    })

    await enviarConvite('p2', GESTOR)

    const usuarios = await prisma.user.findMany({ where: { prestadorId: 'p2' } })
    expect(usuarios).toEqual([
      expect.objectContaining({
        id: 'u-p2',
        name: 'Ana Ribeiro Costa',
        email: 'ana.nova@teste.dev',
      }),
    ])
    expect(caixa.enviados.map((e) => e.para)).toEqual(['ana.nova@teste.dev'])
  })

  it('reenviar invalida o convite anterior: só o último link vale', async () => {
    await enviarConvite('p3', GESTOR)
    await enviarConvite('p3', GESTOR)

    const [primeiro, segundo] = caixa.enviados.map((e) => tokenDoEmail(e.texto))
    expect(primeiro).not.toBe(segundo)
    const convites = await convitesDoUsuario('u-p3')
    expect(convites.map((c) => c.identifier)).toEqual([`reset-password:${segundo}`])
  })

  it('prestador inativo recebe convite: ele continua entrando', async () => {
    expect((await prisma.prestador.findUniqueOrThrow({ where: { id: 'p5' } })).status).toBe(
      'inativo',
    )
    await expect(enviarConvite('p5', GESTOR)).resolves.toMatchObject({
      email: 'roberto.alves@email.com',
    })
    expect(caixa.enviados).toHaveLength(1)
  })

  it('recusa sem e-mail, e-mail de outra conta, excluído e inexistente, sem criar nada', async () => {
    await novoPrestador('p-conv-sem', { email: '   ' })
    await novoPrestador('p-conv-gestor', { email: 'Renata@Russo.dev' })
    await novoPrestador('p-conv-outro', { email: 'contato@marinacosta.com.br' })
    await novoPrestador('p-conv-excluido', { excluidoEm: new Date() })

    await expect(enviarConvite('p-conv-sem', GESTOR)).rejects.toMatchObject({
      codigo: 'prestador_sem_email',
      message: 'Cadastre um e-mail para enviar o convite',
      status: 409,
    })
    for (const id of ['p-conv-gestor', 'p-conv-outro']) {
      await expect(enviarConvite(id, GESTOR)).rejects.toMatchObject({
        codigo: 'email_em_uso',
        message: 'Este e-mail já é usado por outra conta',
        status: 409,
      })
    }
    for (const id of ['p-conv-excluido', 'nao-existe']) {
      await expect(enviarConvite(id, GESTOR)).rejects.toMatchObject({
        codigo: 'nao_encontrado',
        status: 404,
      })
    }

    expect(caixa.enviados).toEqual([])
    const ids = ['p-conv-sem', 'p-conv-gestor', 'p-conv-outro', 'p-conv-excluido']
    expect(await prisma.user.count({ where: { prestadorId: { in: ids } } })).toBe(0)
  })

  it('só a gestão convida', async () => {
    await expect(enviarConvite('p6', { papel: 'prestador' })).rejects.toMatchObject({
      status: 403,
    })
    expect(caixa.enviados).toEqual([])
  })

  it('falha no envio: erro 502 claro e nenhum convite válido fica para trás', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    trocarCorreio({ enviar: () => Promise.reject(new Error('421 servidor indisponível')) })
    await novoPrestador('p-conv-falha')

    const erro = await enviarConvite('p-conv-falha', GESTOR).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroEnvioConvite)
    expect(erro).toMatchObject({
      status: 502,
      message: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
    })
    expect((await acessosDosPrestadores(['p-conv-falha'])).get('p-conv-falha')).toBe('pendente')
    vi.restoreAllMocks()
  })
})

describe('acessosDosPrestadores', () => {
  beforeAll(() => semear(prisma))

  it('ativo (tem senha), pendente, convidado e sem_email', async () => {
    await novoPrestador('p-ac-sem', { email: null })
    await enviarConvite('p6', GESTOR)

    const acessos = await acessosDosPrestadores(['p1', 'p2', 'p6', 'p-ac-sem'])

    expect(Object.fromEntries(acessos)).toEqual({
      p1: 'ativo',
      p2: 'pendente',
      p6: 'convidado',
      'p-ac-sem': 'sem_email',
    })
  })

  it('convite vencido volta a pendente', async () => {
    const depoisDaValidade = new Date(Date.now() + 8 * DIA)
    expect((await acessosDosPrestadores(['p6'], depoisDaValidade)).get('p6')).toBe('pendente')
  })

  it('ids desconhecidos ficam de fora e a lista vazia devolve um mapa vazio', async () => {
    expect([...(await acessosDosPrestadores(['p1', 'nao-existe'])).keys()]).toEqual(['p1'])
    expect((await acessosDosPrestadores([])).size).toBe(0)
  })
})

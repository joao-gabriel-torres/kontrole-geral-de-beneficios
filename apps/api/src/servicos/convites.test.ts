import { createHash } from 'node:crypto'
import { semear } from '@kgb/db/seed'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarCorreioEmMemoria, trocarCorreio, type CorreioEmMemoria } from '../correio'
import { criarCorreioSmtp } from '../correio/smtp'
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

/** Convites do usuário: com hash (`reset-password-sha256:`) e os antigos, em texto puro. */
const convitesDoUsuario = (userId: string) =>
  prisma.verification.findMany({
    where: { value: userId, identifier: { startsWith: 'reset-password' } },
  })

/** O que fica no banco para um token: só o SHA-256 do identificador do Better Auth. */
const gravado = (token: string) =>
  `reset-password-sha256:${createHash('sha256').update(`reset-password:${token}`).digest('base64url')}`

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
    // O banco guarda só o hash: quem lê a tabela não consegue usar o convite.
    const token = tokenDoEmail(email.texto)
    expect(convites[0].identifier).toBe(gravado(token))
    expect(convites[0].identifier).not.toContain(token)
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
    expect(convites.map((c) => c.identifier)).toEqual([gravado(segundo)])
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

  it('e-mail malformado: recusa sem criar usuário, sem e-mail e sem trocar o login de quem já tem senha', async () => {
    // O Carlos (p1) já tem senha: o texto inválido não pode virar o login dele.
    const carlos = await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })
    const emailDoCadastro = (await prisma.prestador.findUniqueOrThrow({ where: { id: 'p1' } }))
      .email
    await novoPrestador('p-conv-invalido', { email: 'a@x.com; b@y.com' })

    for (const email of ['a@x.com; b@y.com', 'a@x.com, b@y.com', 'Ana <a@x.com>']) {
      await prisma.prestador.update({ where: { id: 'p1' }, data: { email } })
      await expect(enviarConvite('p1', GESTOR)).rejects.toMatchObject({
        codigo: 'email_invalido',
        message: 'O e-mail do cadastro não é válido',
        status: 409,
      })
    }
    await prisma.prestador.update({ where: { id: 'p1' }, data: { email: emailDoCadastro } })
    await expect(enviarConvite('p-conv-invalido', GESTOR)).rejects.toMatchObject({
      codigo: 'email_invalido',
    })

    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'u-p1' } })).toEqual(carlos)
    expect(await prisma.user.count({ where: { prestadorId: 'p-conv-invalido' } })).toBe(0)
    expect(await convitesDoUsuario('u-p1')).toEqual([])
    expect(caixa.enviados).toEqual([])
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
      codigo: 'envio_email_falhou',
      message: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
    })
    expect((await acessosDosPrestadores(['p-conv-falha'])).get('p-conv-falha')).toBe('pendente')
    vi.restoreAllMocks()
  })

  it('reenvio que falha no envio mantém o convite anterior, que ainda vale', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await novoPrestador('p-conv-reenvio')
    await enviarConvite('p-conv-reenvio', GESTOR)
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { prestadorId: 'p-conv-reenvio' },
    })
    const anteriores = await convitesDoUsuario(usuario.id)
    expect(anteriores).toHaveLength(1)

    trocarCorreio({ enviar: () => Promise.reject(new Error('421 servidor indisponível')) })
    await expect(enviarConvite('p-conv-reenvio', GESTOR)).rejects.toBeInstanceOf(ErroEnvioConvite)

    expect(await convitesDoUsuario(usuario.id)).toEqual(anteriores)
    expect((await acessosDosPrestadores(['p-conv-reenvio'])).get('p-conv-reenvio')).toBe(
      'convidado',
    )
    vi.restoreAllMocks()
  })

  it('convites simultâneos com falhas no meio: sobra um só, de um e-mail que saiu', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await novoPrestador('p-conv-mistura')
    await enviarConvite('p-conv-mistura', GESTOR)
    const saiu: string[] = []
    let chamadas = 0
    trocarCorreio({
      enviar: async (mensagem) => {
        const chamada = ++chamadas
        // Falha em chamadas alternadas e responde fora de ordem.
        await new Promise((r) => setTimeout(r, (chamada * 7) % 30))
        if (chamada % 2 === 0) throw new Error('421 servidor indisponível')
        saiu.push(mensagem.texto)
      },
    })

    const resultados = await Promise.allSettled(
      Array.from({ length: 8 }, () => enviarConvite('p-conv-mistura', GESTOR)),
    )

    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(4)
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { prestadorId: 'p-conv-mistura' },
    })
    const convites = await convitesDoUsuario(usuario.id)
    expect(convites).toHaveLength(1)
    const tokensQueSairam = saiu.map((texto) => gravado(tokenDoEmail(texto)))
    expect(tokensQueSairam).toContain(convites[0].identifier)
    vi.restoreAllMocks()
  })

  it('convite antigo, em texto puro (de antes do hash): conta como convidado e cai no reenvio', async () => {
    await novoPrestador('p-conv-legado')
    await enviarConvite('p-conv-legado', GESTOR)
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { prestadorId: 'p-conv-legado' },
    })
    await prisma.verification.deleteMany({ where: { value: usuario.id } })
    await prisma.verification.create({
      data: {
        id: 'v-conv-legado',
        identifier: 'reset-password:token-em-texto-puro',
        value: usuario.id,
        expiresAt: new Date(Date.now() + DIA),
      },
    })
    expect((await acessosDosPrestadores(['p-conv-legado'])).get('p-conv-legado')).toBe('convidado')

    await enviarConvite('p-conv-legado', GESTOR)

    const novo = tokenDoEmail(caixa.enviados[1].texto)
    expect((await convitesDoUsuario(usuario.id)).map((c) => c.identifier)).toEqual([gravado(novo)])
  })

  it('servidor de e-mail que não responde: 502 dentro do limite e o token sai', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const mudo = { sendMail: () => new Promise<never>(() => {}) }
    trocarCorreio(criarCorreioSmtp('smtp://mudo', 'n@russo.dev', mudo, 100))
    await novoPrestador('p-conv-mudo')

    const erro = await enviarConvite('p-conv-mudo', GESTOR).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroEnvioConvite)
    const usuario = await prisma.user.findUniqueOrThrow({ where: { prestadorId: 'p-conv-mudo' } })
    expect(await convitesDoUsuario(usuario.id)).toEqual([])
    vi.restoreAllMocks()
  }, 5_000)
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

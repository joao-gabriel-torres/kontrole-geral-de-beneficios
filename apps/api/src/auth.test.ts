import { OpenAPIHono } from '@hono/zod-openapi'
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, SENHA_DEV } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { loginDePrestador } from '../test/dados'
import { entrar } from '../test/sessao'
import { criarApp } from './app'
import type { Ambiente } from './contexto'
import { prisma } from './db'
import { exigePapel } from './middlewares/acesso'
import { sessao } from './middlewares/sessao'

const app = criarApp()

describe('GET /api/me', () => {
  it('responde 401 sem sessão', async () => {
    const r = await app.request('/api/me')
    expect(r.status).toBe(401)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'nao_autenticado' } })
  })

  it('devolve a gestora logada por token', async () => {
    const r = await app.request('/api/me', { headers: await entrar(app, GESTORA_DEV.email) })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      id: GESTORA_DEV.id,
      nome: 'Renata Silva',
      email: GESTORA_DEV.email,
      papel: 'gestor',
      prestador: null,
    })
  })

  it('devolve o prestador com o cadastro vinculado', async () => {
    const r = await app.request('/api/me', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({
      papel: 'prestador',
      prestador: { id: 'p1', nome: 'Carlos Mendes' },
    })
  })

  it('aceita a sessão por cookie (fluxo do gestor web)', async () => {
    const login = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ email: GESTORA_DEV.email, password: SENHA_DEV }),
    })
    const cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    const r = await app.request('/api/me', { headers: { cookie } })
    expect(r.status).toBe(200)
  })
})

describe('login', () => {
  it('recusa senha errada', async () => {
    const r = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ email: GESTORA_DEV.email, password: 'senha-errada' }),
    })
    expect(r.status).toBe(401)
  })

  it('não permite cadastro público', async () => {
    const r = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ email: 'novo@teste.dev', password: 'senha-forte-123', name: 'Novo' }),
    })
    expect(r.status).not.toBe(200)
  })
})

describe('exigePapel', () => {
  const protegido = new OpenAPIHono<Ambiente>()
  protegido.use('*', sessao)
  protegido.get('/so-gestor', exigePapel('gestor'), (c) => c.text('ok'))

  it('exige login', async () => {
    expect((await protegido.request('/so-gestor')).status).toBe(401)
  })
  it('bloqueia o papel errado com 403', async () => {
    const r = await protegido.request('/so-gestor', {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    expect(r.status).toBe(403)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'sem_permissao' } })
  })
  it('libera o papel certo', async () => {
    const r = await protegido.request('/so-gestor', {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(200)
  })
})

describe('prestador inativo ou excluído', () => {
  const PRESTADOR = 'p-inativo-teste'
  let email = ''

  const situacao = (dados: { status: 'ativo' | 'inativo'; excluidoEm?: Date | null }) =>
    prisma.prestador.update({ where: { id: PRESTADOR }, data: { excluidoEm: null, ...dados } })

  const login = () =>
    app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5174' },
      body: JSON.stringify({ email, password: SENHA_DEV }),
    })

  beforeAll(async () => {
    await prisma.prestador.upsert({
      where: { id: PRESTADOR },
      update: {},
      create: {
        id: PRESTADOR,
        nome: 'Prestador Inativo',
        documento: '000.000.000-99',
        telefone: '(11) 90000-0099',
        credenciadoDesde: new Date('2024-01-01'),
        cor: '#8FA3A0',
      },
    })
    email = await loginDePrestador(PRESTADOR)
  })

  it('prestador inativo continua entrando: só não recebe acionamentos novos', async () => {
    await situacao({ status: 'inativo' })
    expect((await login()).status).toBe(200)
  })

  it('recusa o login de prestador excluído com 403', async () => {
    await situacao({ status: 'inativo', excluidoEm: new Date() })
    const r = await login()
    expect(r.status).toBe(403)
    expect(await r.json()).toMatchObject({ code: 'PRESTADOR_EXCLUIDO' })
  })

  it('derruba a sessão aberta antes da exclusão', async () => {
    await situacao({ status: 'ativo' })
    const headers = await entrar(app, email)
    await situacao({ status: 'inativo' })
    expect((await app.request('/api/me', { headers })).status).toBe(200)
    await situacao({ status: 'inativo', excluidoEm: new Date() })
    expect((await app.request('/api/me', { headers })).status).toBe(401)
  })
})

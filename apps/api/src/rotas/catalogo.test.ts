import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

const app = criarApp()

describe('GET /api/tipos', () => {
  it('lista os tipos com o checklist, na ordem do cadastro', async () => {
    const r = await app.request('/api/tipos', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(200)
    const tipos = (await r.json()) as {
      nome: string
      cor: string
      categoria: string | null
      checklist: string[]
    }[]
    expect(tipos).toHaveLength(8)
    expect(tipos[0]).toMatchObject({
      id: 't1',
      nome: 'Vazamento',
      cor: '#0069BD',
      categoria: 'Hidráulica',
    })
    expect(tipos[0]!.checklist).toHaveLength(5)
  })
})

describe('GET /api/prestadores', () => {
  interface Opcao {
    id: string
    nome: string
    regiao: string | null
    cep: string | null
    cor: string
  }
  const listar = async (query = '?status=ativo') => {
    const r = await app.request(`/api/prestadores${query}`, {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    return { status: r.status, prestadores: (await r.json()) as Opcao[] }
  }

  it('lista só os ativos, com região e CEP, para o seletor do Novo acionamento', async () => {
    const { status, prestadores } = await listar()
    expect(status).toBe(200)
    expect(prestadores.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p6'])
    expect(prestadores[0]).toEqual({
      id: 'p1',
      nome: 'Carlos Mendes',
      regiao: 'Zona Oeste',
      cep: '05422001',
      cor: '#0069BD',
    })
  })

  it('com ?cep= ordena pela distância numérica; sem CEP vai ao fim, por nome', async () => {
    const { prestadores } = await listar('?cep=05017-000')
    expect(prestadores.map((p) => p.id)).toEqual(['p4', 'p1', 'p2', 'p6', 'p3'])

    await prisma.prestador.update({ where: { id: 'p4' }, data: { cep: null } })
    try {
      const semCep = await listar('?cep=05017000')
      expect(semCep.prestadores.map((p) => p.id)).toEqual(['p1', 'p2', 'p6', 'p3', 'p4'])
    } finally {
      await prisma.prestador.update({ where: { id: 'p4' }, data: { cep: '05018000' } })
    }
  })

  it('recusa ?cep= malformado (422)', async () => {
    const { status } = await listar('?cep=999')
    expect(status).toBe(422)
  })

  it('é só para a gestão', async () => {
    const r = await app.request('/api/prestadores?status=ativo', {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    expect(r.status).toBe(403)
  })
})

import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'

const app = criarApp()

describe('GET /api/tipos', () => {
  it('lista os tipos com o checklist, na ordem do cadastro', async () => {
    const r = await app.request('/api/tipos', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(200)
    const tipos = (await r.json()) as { nome: string; cor: string; checklist: string[] }[]
    expect(tipos).toHaveLength(8)
    expect(tipos[0]).toMatchObject({ id: 't1', nome: 'Vazamento', cor: '#0069BD' })
    expect(tipos[0]!.checklist).toHaveLength(5)
  })
})

describe('GET /api/prestadores', () => {
  it('lista só os ativos, com região, para o seletor do Novo acionamento', async () => {
    const r = await app.request('/api/prestadores?status=ativo', {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(200)
    const prestadores = (await r.json()) as { id: string; nome: string; regiao: string | null }[]
    expect(prestadores.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p6'])
    expect(prestadores[0]).toEqual({
      id: 'p1',
      nome: 'Carlos Mendes',
      regiao: 'Zona Oeste',
      cor: '#0069BD',
    })
  })
  it('é só para a gestão', async () => {
    const r = await app.request('/api/prestadores?status=ativo', {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    expect(r.status).toBe(403)
  })
})

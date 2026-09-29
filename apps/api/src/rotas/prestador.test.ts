import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

const app = criarApp()

describe('GET /api/prestador/inicio', () => {
  beforeAll(async () => {
    await semear(prisma)
  })

  it('traz o próximo atendimento, a agenda de hoje, as métricas e a rota — como no protótipo', async () => {
    const r = await app.request('/api/prestador/inicio', {
      headers: await entrar(app, EMAIL_PRESTADOR_DEV),
    })
    expect(r.status).toBe(200)
    const inicio = await r.json()
    expect(inicio.proximo).toMatchObject({
      titulo: 'Vazamento no teto do banheiro',
      inicio: '10:30',
      fim: '12:30',
    })
    expect(inicio.hoje.map((a: { titulo: string }) => a.titulo)).toEqual([
      'Limpeza de ar-condicionado',
      'Vazamento no teto do banheiro',
      'Ponto de luz na recepção',
    ])
    expect(inicio.metricas).toMatchObject({ hoje: 3, paraCorrigir: 1 })
    expect(inicio.metricas.aprovacao.taxa).toBeGreaterThan(0)
    expect(inicio.rotaDoDia).toEqual([
      'Rua Bela Cintra, 1200 · Consolação',
      'Rua Haddock Lobo, 595 · Cerqueira César',
    ])
  })

  it('é só para o prestador', async () => {
    const r = await app.request('/api/prestador/inicio', {
      headers: await entrar(app, GESTORA_DEV.email),
    })
    expect(r.status).toBe(403)
  })
})

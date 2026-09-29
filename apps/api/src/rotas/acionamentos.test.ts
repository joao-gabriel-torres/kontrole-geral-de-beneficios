import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, SENHA_DEV } from '@kgb/db/seed'
import { hashPassword } from 'better-auth/crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

const app = criarApp()
const EMAIL_SEM_VINCULO = 'sem-vinculo@russo.dev'

describe('GET /api/acionamentos/contagem', () => {
  beforeAll(async () => {
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

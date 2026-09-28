import { verifyPassword } from 'better-auth/crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarPrisma } from '../index'
import { prepararBancoDeTeste } from '../testes'
import { EMAIL_PRESTADOR_DEV, SENHA_DEV, semear, verificarAmbienteSeed } from './index'

describe('semear', () => {
  const prisma = criarPrisma(process.env.DATABASE_URL_TEST)
  beforeAll(async () => {
    await prepararBancoDeTeste()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('popula o banco e pode rodar de novo sem duplicar', async () => {
    const primeiro = await semear(prisma)
    const segundo = await semear(prisma)
    expect(segundo).toEqual(primeiro)
    expect(await prisma.acionamento.count()).toBe(primeiro.acionamentos)
    expect(await prisma.tipoDemanda.count()).toBe(8)
    expect(await prisma.configuracao.findUnique({ where: { id: 1 } })).toMatchObject({
      photoMin: 1,
    })
  })

  it('cria a conta do prestador de dev com a senha documentada', async () => {
    const usuario = await prisma.user.findUniqueOrThrow({
      where: { email: EMAIL_PRESTADOR_DEV },
      include: { accounts: true },
    })
    expect(usuario.prestadorId).toBe('p1')
    expect(usuario.accounts[0]?.providerId).toBe('credential')
    expect(
      await verifyPassword({ hash: usuario.accounts[0]!.password!, password: SENHA_DEV }),
    ).toBe(true)
  })

  it('continua a numeração depois do último acionamento do seed', async () => {
    const maior = await prisma.acionamento.aggregate({ _max: { numero: true } })
    const existente = await prisma.acionamento.findFirstOrThrow()
    const novo = await prisma.acionamento.create({
      data: {
        titulo: 'Novo',
        cliente: 'Cliente',
        endereco: 'Rua A, 1',
        data: new Date('2026-09-28'),
        inicio: '09:00',
        fim: '10:00',
        prestadorId: existente.prestadorId,
        criadoPorId: existente.criadoPorId,
      },
    })
    expect(novo.numero).toBe((maior._max.numero ?? 0) + 1)
  })

  it('recusa rodar em produção', () => {
    expect(() => verificarAmbienteSeed('production')).toThrow(/production/)
    expect(() => verificarAmbienteSeed('development')).not.toThrow()
  })
})

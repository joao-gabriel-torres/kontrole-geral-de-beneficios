import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { codigoAcionamento, criarPrisma } from './index'
import { prepararBancoDeTeste, verificarUrlDeTeste } from './testes'

describe('codigoAcionamento', () => {
  it('formata o número com o prefixo AC-', () => {
    expect(codigoAcionamento(1052)).toBe('AC-1052')
  })
})

describe('verificarUrlDeTeste', () => {
  it('recusa bancos que não terminam em _test', () => {
    expect(() => verificarUrlDeTeste('postgresql://localhost:5432/kgb_dev')).toThrow(/_test/)
  })
  it('recusa url ausente', () => {
    expect(() => verificarUrlDeTeste(undefined)).toThrow(/DATABASE_URL_TEST/)
  })
  it('aceita bancos *_test', () => {
    const url = 'postgresql://localhost:5432/kgb_test'
    expect(verificarUrlDeTeste(url)).toBe(url)
  })
})

describe('schema', () => {
  const prisma = criarPrisma(process.env.DATABASE_URL_TEST)
  beforeAll(async () => {
    await prepararBancoDeTeste()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('numera acionamentos em sequência e começa como "aberto"', async () => {
    const gestor = await prisma.user.create({
      data: { id: 'u-teste', name: 'Gestora', email: 'gestora@teste.dev', role: 'gestor' },
    })
    const tipo = await prisma.tipoDemanda.create({
      data: { nome: 'Vazamento', cor: '#0069BD', checklist: ['Localizar', 'Vedar'] },
    })
    const prestador = await prisma.prestador.create({
      data: {
        nome: 'Prestador',
        documento: '12345678901',
        telefone: '11987654321',
        cor: '#0069BD',
        credenciadoDesde: new Date('2024-03-12'),
        especialidades: { create: [{ tipoId: tipo.id, ordem: 0 }] },
      },
    })
    const base = {
      titulo: 'Teste',
      cliente: 'Cliente',
      endereco: 'Rua A, 1 · Centro',
      data: new Date('2026-09-28'),
      inicio: '09:00',
      fim: '10:00',
      prestadorId: prestador.id,
      criadoPorId: gestor.id,
    }
    const primeiro = await prisma.acionamento.create({ data: base })
    const segundo = await prisma.acionamento.create({ data: base })
    expect(segundo.numero).toBe(primeiro.numero + 1)
    expect(primeiro.status).toBe('aberto')
    expect(primeiro.inviavel).toBe(false)
  })

  it('documento só é único entre os prestadores não excluídos', async () => {
    const dados = {
      nome: 'Duplicado',
      documento: '98765432100',
      telefone: '11912345678',
      cor: '#0069BD',
      credenciadoDesde: new Date('2024-03-12'),
    }
    await prisma.prestador.create({ data: { ...dados, excluidoEm: new Date() } })
    await prisma.prestador.create({ data: dados })
    await expect(prisma.prestador.create({ data: dados })).rejects.toMatchObject({ code: 'P2002' })
  })

  it('nome de tipo só é único entre os tipos não excluídos', async () => {
    const dados = { nome: 'Jardinagem', cor: '#1E9E6A', checklist: [] }
    await prisma.tipoDemanda.create({ data: { ...dados, excluidoEm: new Date() } })
    await prisma.tipoDemanda.create({ data: dados })
    await expect(prisma.tipoDemanda.create({ data: dados })).rejects.toMatchObject({
      code: 'P2002',
    })
  })
})

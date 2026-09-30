import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear } from '@kgb/db/seed'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { corpo, hojeSP } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'
import type { Painel } from '../dominio/painel'

const app = criarApp()

describe('GET /api/painel', () => {
  let gestora: Record<string, string>
  beforeAll(async () => {
    await semear(prisma)
    gestora = await entrar(app, GESTORA_DEV.email)
  })

  const ranking = (p: Painel) =>
    p.ranking.map((r) => [
      r.prestador.nome,
      r.concluidos,
      `${r.revisoes.aprovadas}/${r.revisoes.total}`,
      r.tempoMedioMin === null ? null : Math.round(r.tempoMedioMin * 100) / 100,
    ])

  it('sem período, traz os últimos 7 dias com os números do seed', async () => {
    const r = await app.request('/api/painel', { headers: gestora })
    expect(r.status).toBe(200)
    const p = await corpo<Painel>(r)
    expect(p).toMatchObject({
      hoje: hojeSP(),
      periodo: 7,
      emAberto: 10,
      paraHoje: 4,
      aguardando: 3,
      aprovacao: { aprovadas: 8, total: 11 },
      inviaveis: { quantidade: 1, totalPeriodo: 16 },
    })
    expect(p.tempoMedioMin).toBeCloseTo(106.1538, 3)
    expect(p.volume.at(-1)!.data).toBe(hojeSP())
    expect(p.volume.map((v) => [v.total, v.aprovados])).toEqual([
      [2, 2],
      [2, 1],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 0],
      [4, 0],
    ])
    expect(p.reprovacoesPorTipo).toEqual([
      { tipoNome: 'Reparo em gesso', reprovacoes: 2, demandas: 3 },
      { tipoNome: 'Revisão elétrica', reprovacoes: 1, demandas: 3 },
    ])
    expect(ranking(p)).toEqual([
      ['Carlos Mendes', 3, '4/5', 69.29],
      ['Ana Ribeiro', 2, '2/2', 200],
      ['João Pires', 1, '1/2', 82.5],
      ['Marina Costa', 1, '1/2', 130],
      ['Luciana Prado', 0, '0/0', null],
    ])
    expect(p.ranking[0]!.prestador).toEqual({ id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' })
  })

  it('com periodo=30, os últimos 30 dias', async () => {
    const r = await app.request('/api/painel?periodo=30', { headers: gestora })
    expect(r.status).toBe(200)
    const p = await corpo<Painel>(r)
    expect(p).toMatchObject({
      periodo: 30,
      emAberto: 10,
      aprovacao: { aprovadas: 57, total: 70 },
      inviaveis: { quantidade: 3, totalPeriodo: 65 },
    })
    expect(p.tempoMedioMin).toBeCloseTo(115.3065, 3)
    expect(p.volume).toHaveLength(30)
    expect(p.reprovacoesPorTipo.map((t) => [t.tipoNome, t.reprovacoes, t.demandas])).toEqual([
      ['Chaveiro', 4, 9],
      ['Reparo em gesso', 3, 12],
      ['Ponto de luz', 2, 9],
      ['Revisão elétrica', 2, 7],
      ['Limpeza de ar-condicionado', 1, 8],
      ['Pintura', 1, 11],
      ['Vazamento', 1, 8],
    ])
    expect(ranking(p)).toEqual([
      ['João Pires', 15, '16/19', 112.53],
      ['Ana Ribeiro', 14, '15/18', 130.56],
      ['Marina Costa', 14, '14/18', 122.5],
      ['Carlos Mendes', 11, '12/15', 95.47],
      ['Luciana Prado', 0, '0/0', null],
    ])
  })

  it('recusa período fora de 7 e 30 (422)', async () => {
    const r = await app.request('/api/painel?periodo=15', { headers: gestora })
    expect(r.status).toBe(422)
  })

  it('é só para a gestão (prestador: 403)', async () => {
    const r = await app.request('/api/painel', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(403)
  })

  it('exige login (401)', async () => {
    const r = await app.request('/api/painel')
    expect(r.status).toBe(401)
  })
})

describe('GET /api/painel — prestador excluído e inativo', () => {
  let gestora: Record<string, string>
  beforeAll(async () => {
    await semear(prisma)
    gestora = await entrar(app, GESTORA_DEV.email)
  })
  afterAll(() => semear(prisma))

  it('excluído some do ranking sem mudar KPIs nem volume; inativo com atividade continua', async () => {
    // Carlos (p1) lidera o ranking dos 7 dias; Marina (p4) tem atividade no período.
    await prisma.prestador.update({ where: { id: 'p1' }, data: { excluidoEm: new Date() } })
    await prisma.prestador.update({ where: { id: 'p4' }, data: { status: 'inativo' } })

    const r = await app.request('/api/painel', { headers: gestora })
    expect(r.status).toBe(200)
    const p = await corpo<Painel>(r)

    // O excluído sai mesmo com atividade; a inativa fica porque tem atividade no período.
    expect(p.ranking.map((x) => x.prestador.nome)).toEqual([
      'Ana Ribeiro',
      'João Pires',
      'Marina Costa',
      'Luciana Prado',
    ])
    // KPIs e volume contam acionamentos, não prestadores: continuam os do seed.
    expect(p).toMatchObject({
      emAberto: 10,
      paraHoje: 4,
      aguardando: 3,
      aprovacao: { aprovadas: 8, total: 11 },
      inviaveis: { quantidade: 1, totalPeriodo: 16 },
    })
    expect(p.tempoMedioMin).toBeCloseTo(106.1538, 3)
    expect(p.volume.map((v) => [v.total, v.aprovados])).toEqual([
      [2, 2],
      [2, 1],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 0],
      [4, 0],
    ])
  })
})

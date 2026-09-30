import { carregarDadosPrototipo } from '@kgb/db/seed'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  calcularPainel,
  diasDoPeriodo,
  type AcionamentoPainel,
  type EntradaPainel,
  type Periodo,
  type PrestadorPainel,
} from './painel'

const HOJE = '2026-09-29'

const ac = (p: Partial<AcionamentoPainel> = {}): AcionamentoPainel => ({
  numero: 1001,
  data: HOJE,
  status: 'aprovado',
  inviavel: false,
  prestadorId: 'p1',
  iniciadoEm: null,
  primeiroEnvioEm: null,
  revisoes: [],
  tipos: ['Vazamento'],
  ...p,
})

const prestador = (p: Partial<PrestadorPainel> & Pick<PrestadorPainel, 'id'>): PrestadorPainel => ({
  nome: `Prestador ${p.id}`,
  cor: '#0069BD',
  status: 'ativo',
  ...p,
})

const entrada = (p: Partial<EntradaPainel> = {}): EntradaPainel => ({
  hoje: HOJE,
  periodo: 7,
  pendentes: [],
  doPeriodo: [],
  prestadores: [],
  ...p,
})

/** Instante em SP: "2026-09-29 08:00" → Date. */
const em = (dataHora: string) => new Date(`${dataHora.replace(' ', 'T')}:00-03:00`)

describe('diasDoPeriodo', () => {
  it('são os últimos P dias contando hoje, do mais antigo para hoje', () => {
    expect(diasDoPeriodo(HOJE, 7)).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
    ])
  })

  it('30 dias atravessam a virada do mês', () => {
    const dias = diasDoPeriodo(HOJE, 30)
    expect(dias).toHaveLength(30)
    expect(dias[0]).toBe('2026-08-31')
    expect(dias.at(-1)).toBe(HOJE)
  })
})

describe('calcularPainel', () => {
  it('sem dados: tudo zerado, tempo médio indefinido e tocos em todos os dias', () => {
    const p = calcularPainel(entrada({ prestadores: [prestador({ id: 'p1' })] }))
    expect(p).toMatchObject({
      hoje: HOJE,
      periodo: 7,
      emAberto: 0,
      paraHoje: 0,
      aguardando: 0,
      aprovacao: { aprovadas: 0, total: 0 },
      tempoMedioMin: null,
      inviaveis: { quantidade: 0, totalPeriodo: 0 },
      reprovacoesPorTipo: [],
    })
    expect(p.volume).toHaveLength(7)
    expect(p.volume.every((v) => v.total === 0 && v.aprovados === 0)).toBe(true)
    expect(p.ranking).toEqual([
      {
        prestador: { id: 'p1', nome: 'Prestador p1', cor: '#0069BD' },
        concluidos: 0,
        revisoes: { aprovadas: 0, total: 0 },
        tempoMedioMin: null,
      },
    ])
  })

  it('em aberto e aguardando ignoram o período; para hoje conta tudo de hoje menos aprovado', () => {
    const p = calcularPainel(
      entrada({
        pendentes: [
          { data: '2026-08-01', status: 'aberto' },
          { data: '2026-10-15', status: 'em_andamento' },
          { data: HOJE, status: 'reprovado' },
          { data: HOJE, status: 'aguardando' },
          { data: '2026-01-01', status: 'aguardando' },
          { data: HOJE, status: 'aprovado' },
        ],
      }),
    )
    expect(p.emAberto).toBe(3)
    expect(p.aguardando).toBe(2)
    expect(p.paraHoje).toBe(2)
  })

  it('ignora acionamentos com data fora do período (antigos e futuros)', () => {
    const p = calcularPainel(
      entrada({
        doPeriodo: [
          ac({ numero: 1, data: '2026-09-22', revisoes: ['aprovado'] }),
          ac({ numero: 2, data: '2026-09-30', revisoes: ['aprovado'] }),
          ac({ numero: 3, data: '2026-09-23', revisoes: ['reprovado'] }),
        ],
      }),
    )
    expect(p.aprovacao).toEqual({ aprovadas: 0, total: 1 })
    expect(p.inviaveis.totalPeriodo).toBe(1)
    expect(p.volume.map((v) => v.total)).toEqual([1, 0, 0, 0, 0, 0, 0])
  })

  it('aprovação conta todas as revisões dos acionamentos do período', () => {
    const p = calcularPainel(
      entrada({
        doPeriodo: [
          ac({ numero: 1, revisoes: ['reprovado', 'aprovado'] }),
          ac({ numero: 2, status: 'reprovado', revisoes: ['reprovado'] }),
        ],
      }),
    )
    expect(p.aprovacao).toEqual({ aprovadas: 1, total: 3 })
  })

  it('tempo médio é a média de 1º envio − início, em minutos com fração', () => {
    const p = calcularPainel(
      entrada({
        doPeriodo: [
          ac({
            numero: 1,
            iniciadoEm: em('2026-09-29 08:00'),
            primeiroEnvioEm: em('2026-09-29 09:20'),
          }),
          ac({
            numero: 2,
            iniciadoEm: em('2026-09-28 10:00'),
            primeiroEnvioEm: em('2026-09-28 11:25'),
          }),
          ac({ numero: 3, iniciadoEm: em('2026-09-28 10:00'), primeiroEnvioEm: null }),
          ac({ numero: 4, iniciadoEm: null, primeiroEnvioEm: em('2026-09-28 11:00') }),
        ],
      }),
    )
    expect(p.tempoMedioMin).toBe(82.5)
  })

  it('inviáveis contam acionamentos com inviavel, sobre todos os do período', () => {
    const p = calcularPainel(
      entrada({
        doPeriodo: [
          ac({ numero: 1, status: 'aguardando', inviavel: true }),
          ac({ numero: 2, status: 'aprovado', inviavel: true }),
          ac({ numero: 3, status: 'aberto' }),
          ac({ numero: 4, status: 'aprovado' }),
        ],
      }),
    )
    expect(p.inviaveis).toEqual({ quantidade: 2, totalPeriodo: 4 })
  })

  it('volume por dia: aprovados são os aprovados não inviáveis', () => {
    const p = calcularPainel(
      entrada({
        doPeriodo: [
          ac({ numero: 1, data: '2026-09-28', status: 'aprovado' }),
          ac({ numero: 2, data: '2026-09-28', status: 'aprovado', inviavel: true }),
          ac({ numero: 3, data: '2026-09-28', status: 'aberto' }),
          ac({ numero: 4, data: HOJE, status: 'aguardando' }),
        ],
      }),
    )
    expect(p.volume.at(-2)).toEqual({ data: '2026-09-28', total: 3, aprovados: 1 })
    expect(p.volume.at(-1)).toEqual({ data: HOJE, total: 1, aprovados: 0 })
    expect(p.volume[0]).toEqual({ data: '2026-09-23', total: 0, aprovados: 0 })
  })

  describe('reprovações por tipo', () => {
    it('cada reprovação soma 1 em cada demanda; a taxa pode passar de 100%', () => {
      const p = calcularPainel(
        entrada({
          doPeriodo: [
            ac({
              numero: 1,
              revisoes: ['reprovado', 'reprovado', 'aprovado'],
              tipos: ['Chaveiro', 'Pintura'],
            }),
            ac({ numero: 2, tipos: ['Pintura'] }),
          ],
        }),
      )
      expect(p.reprovacoesPorTipo).toEqual([
        { tipoNome: 'Chaveiro', reprovacoes: 2, demandas: 1 },
        { tipoNome: 'Pintura', reprovacoes: 2, demandas: 2 },
      ])
    })

    it('agrupa pelo nome gravado na demanda: um tipo renomeado aparece com os dois nomes', () => {
      const p = calcularPainel(
        entrada({
          doPeriodo: [
            ac({ numero: 1, revisoes: ['reprovado'], tipos: ['Chaveiro'] }),
            ac({ numero: 2, revisoes: ['reprovado'], tipos: ['Chaveiro 24h'] }),
          ],
        }),
      )
      expect(p.reprovacoesPorTipo.map((r) => r.tipoNome)).toEqual(['Chaveiro', 'Chaveiro 24h'])
    })

    it('ordem: mais reprovações primeiro; no empate, a primeira aparição (número, ordem da demanda)', () => {
      const p = calcularPainel(
        entrada({
          doPeriodo: [
            ac({ numero: 1003, revisoes: ['reprovado', 'reprovado'], tipos: ['Pintura'] }),
            ac({ numero: 1002, revisoes: ['reprovado'], tipos: ['Vazamento', 'Chaveiro'] }),
            ac({ numero: 1001, revisoes: ['aprovado'], tipos: ['Ponto de luz'] }),
            ac({ numero: 1004, revisoes: ['reprovado'], tipos: ['Ponto de luz'] }),
          ],
        }),
      )
      expect(p.reprovacoesPorTipo.map((r) => [r.tipoNome, r.reprovacoes])).toEqual([
        ['Pintura', 2],
        ['Vazamento', 1],
        ['Chaveiro', 1],
        ['Ponto de luz', 1],
      ])
      expect(p.reprovacoesPorTipo.at(-1)!.demandas).toBe(2)
    })
  })

  describe('ranking', () => {
    it('ativos sempre; inativos só com acionamento no período (qualquer status)', () => {
      const p = calcularPainel(
        entrada({
          prestadores: [
            prestador({ id: 'p1' }),
            prestador({ id: 'p5', status: 'inativo' }),
            prestador({ id: 'p7', status: 'inativo' }),
          ],
          doPeriodo: [
            ac({ numero: 1, prestadorId: 'p7', status: 'aberto' }),
            ac({ numero: 2, prestadorId: 'p5', data: '2026-09-01' }),
          ],
        }),
      )
      expect(p.ranking.map((r) => r.prestador.id)).toEqual(['p1', 'p7'])
    })

    it('só os prestadores recebidos entram (o excluído não), mas os acionamentos dele contam no resto', () => {
      const p = calcularPainel(
        entrada({
          prestadores: [prestador({ id: 'p1' })],
          doPeriodo: [ac({ numero: 1, prestadorId: 'p9', revisoes: ['aprovado'] })],
        }),
      )
      expect(p.ranking.map((r) => r.prestador.id)).toEqual(['p1'])
      expect(p.aprovacao).toEqual({ aprovadas: 1, total: 1 })
      expect(p.volume.at(-1)!.aprovados).toBe(1)
    })

    it('concluídos são os aprovados não inviáveis; ordem por concluídos e depois pela taxa exata', () => {
      const p = calcularPainel(
        entrada({
          prestadores: [prestador({ id: 'a' }), prestador({ id: 'b' }), prestador({ id: 'c' })],
          doPeriodo: [
            ac({ numero: 1, prestadorId: 'a', revisoes: ['reprovado', 'aprovado'] }),
            ac({ numero: 2, prestadorId: 'b', revisoes: ['aprovado'] }),
            ac({ numero: 3, prestadorId: 'c', revisoes: ['aprovado'] }),
            ac({ numero: 4, prestadorId: 'c', inviavel: true, revisoes: ['aprovado'] }),
          ],
        }),
      )
      expect(p.ranking.map((r) => [r.prestador.id, r.concluidos, r.revisoes])).toEqual([
        ['b', 1, { aprovadas: 1, total: 1 }],
        ['c', 1, { aprovadas: 2, total: 2 }],
        ['a', 1, { aprovadas: 1, total: 2 }],
      ])
    })

    it('no empate completo, mantém a ordem recebida (cadastro)', () => {
      const p = calcularPainel(
        entrada({ prestadores: [prestador({ id: 'z' }), prestador({ id: 'a' })] }),
      )
      expect(p.ranking.map((r) => r.prestador.id)).toEqual(['z', 'a'])
    })

    it('tempo médio por prestador, indefinido sem envios', () => {
      const p = calcularPainel(
        entrada({
          prestadores: [prestador({ id: 'a' }), prestador({ id: 'b' })],
          doPeriodo: [
            ac({
              numero: 1,
              prestadorId: 'a',
              iniciadoEm: em('2026-09-29 08:00'),
              primeiroEnvioEm: em('2026-09-29 10:02'),
            }),
            ac({ numero: 2, prestadorId: 'b', status: 'aberto' }),
          ],
        }),
      )
      expect(p.ranking.find((r) => r.prestador.id === 'a')!.tempoMedioMin).toBe(122)
      expect(p.ranking.find((r) => r.prestador.id === 'b')!.tempoMedioMin).toBeNull()
    })
  })
})

describe('calcularPainel com o seed do protótipo (hoje = 29/09/2026)', () => {
  let dados: ReturnType<typeof carregarDadosPrototipo>
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-29T12:00:00-03:00'))
    dados = carregarDadosPrototipo()
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  function doSeed(periodo: Periodo) {
    const acionamentos: AcionamentoPainel[] = dados.acs.map((a) => ({
      numero: Number(a.code.slice(3)),
      data: a.date,
      status: a.status,
      inviavel: a.inviavel,
      prestadorId: a.pid,
      iniciadoEm: a.startedAt ? new Date(a.startedAt) : null,
      primeiroEnvioEm: a.subs[0] ? new Date(a.subs[0]) : null,
      revisoes: a.reviews.map((r) => (r.d === 'a' ? 'aprovado' : 'reprovado')),
      tipos: a.demandas.map((d) => d.typeName),
    }))
    return calcularPainel({
      hoje: HOJE,
      periodo,
      pendentes: acionamentos.filter((a) => a.status !== 'aprovado'),
      doPeriodo: acionamentos,
      prestadores: dados.pros
        .filter((p) => !p.deleted)
        .map((p) => ({ id: p.id, nome: p.name, cor: p.color, status: p.status })),
    })
  }

  const ranking = (periodo: Periodo) =>
    doSeed(periodo).ranking.map((r) => [
      r.prestador.nome,
      r.concluidos,
      r.revisoes.aprovadas,
      r.revisoes.total,
      r.tempoMedioMin,
    ])

  it('KPIs de 7 dias', () => {
    const p = doSeed(7)
    expect(p).toMatchObject({
      emAberto: 10,
      paraHoje: 4,
      aguardando: 3,
      aprovacao: { aprovadas: 8, total: 11 },
      inviaveis: { quantidade: 1, totalPeriodo: 16 },
    })
    expect(p.tempoMedioMin).toBeCloseTo(106.1538, 3)
  })

  it('KPIs de 30 dias', () => {
    const p = doSeed(30)
    expect(p).toMatchObject({
      emAberto: 10,
      paraHoje: 4,
      aguardando: 3,
      aprovacao: { aprovadas: 57, total: 70 },
      inviaveis: { quantidade: 3, totalPeriodo: 65 },
    })
    expect(p.tempoMedioMin).toBeCloseTo(115.3065, 3)
  })

  it('volume de 7 dias (Qua→Ter)', () => {
    const p = doSeed(7)
    expect(p.volume.map((v) => v.data)).toEqual(diasDoPeriodo(HOJE, 7))
    expect(p.volume.map((v) => v.total)).toEqual([2, 2, 1, 2, 2, 3, 4])
    expect(p.volume.map((v) => v.aprovados)).toEqual([2, 1, 1, 1, 2, 0, 0])
  })

  it('volume de 30 dias', () => {
    const p = doSeed(30)
    expect(p.volume[0]!.data).toBe('2026-08-31')
    expect(p.volume.map((v) => v.total)).toEqual([
      3, 2, 2, 2, 1, 2, 2, 1, 3, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 1, 2, 2, 3, 4,
    ])
    expect(p.volume.map((v) => v.aprovados)).toEqual([
      3, 1, 2, 2, 1, 2, 2, 1, 3, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 1, 1, 1, 2, 0, 0,
    ])
  })

  it('reprovações por tipo de 7 e 30 dias, na ordem do protótipo', () => {
    const linhas = (periodo: Periodo) =>
      doSeed(periodo).reprovacoesPorTipo.map((r) => [r.tipoNome, r.reprovacoes, r.demandas])
    expect(linhas(7)).toEqual([
      ['Reparo em gesso', 2, 3],
      ['Revisão elétrica', 1, 3],
    ])
    expect(linhas(30)).toEqual([
      ['Chaveiro', 4, 9],
      ['Reparo em gesso', 3, 12],
      ['Ponto de luz', 2, 9],
      ['Revisão elétrica', 2, 7],
      ['Limpeza de ar-condicionado', 1, 8],
      ['Pintura', 1, 11],
      ['Vazamento', 1, 8],
    ])
  })

  it('ranking de 7 dias, com os 82,5 min exatos do João', () => {
    const r = ranking(7)
    expect(r.map((l) => l.slice(0, 4))).toEqual([
      ['Carlos Mendes', 3, 4, 5],
      ['Ana Ribeiro', 2, 2, 2],
      ['João Pires', 1, 1, 2],
      ['Marina Costa', 1, 1, 2],
      ['Luciana Prado', 0, 0, 0],
    ])
    expect(r.map((l) => l[4])).toEqual([expect.closeTo(69.2857, 3), 200, 82.5, 130, null])
  })

  it('ranking de 30 dias, com os 122,5 min exatos da Marina', () => {
    const r = ranking(30)
    expect(r.map((l) => l.slice(0, 4))).toEqual([
      ['João Pires', 15, 16, 19],
      ['Ana Ribeiro', 14, 15, 18],
      ['Marina Costa', 14, 14, 18],
      ['Carlos Mendes', 11, 12, 15],
      ['Luciana Prado', 0, 0, 0],
    ])
    expect(r[2]![4]).toBe(122.5)
  })
})

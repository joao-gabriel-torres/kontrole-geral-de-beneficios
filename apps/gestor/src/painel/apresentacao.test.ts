import type { ResumoAcionamento } from '@kgb/api-client'
import { describe, expect, it } from 'vitest'
import { resumo } from '../../test/fixtures'
import {
  barrasDoVolume,
  itensDaFila,
  kpisDoPainel,
  linhasDeReprovacao,
  linhasDoRanking,
  type PainelGestor,
} from './apresentacao'
import { painelDoSeed } from './fixtures-painel'

const vazio = (p: Partial<PainelGestor> = {}): PainelGestor => ({
  ...painelDoSeed(),
  emAberto: 0,
  paraHoje: 0,
  aguardando: 0,
  aprovacao: { aprovadas: 0, total: 0 },
  tempoMedioMin: null,
  inviaveis: { quantidade: 0, totalPeriodo: 0 },
  volume: painelDoSeed().volume.map((v) => ({ ...v, total: 0, aprovados: 0 })),
  reprovacoesPorTipo: [],
  ranking: [],
  ...p,
})

describe('kpisDoPainel', () => {
  it('monta os 5 cartões do protótipo, com os de ação levando à lista e às aprovações', () => {
    expect(kpisDoPainel(painelDoSeed())).toEqual([
      {
        rotulo: 'Acionamentos em aberto',
        valor: '10',
        sub: '4 para hoje',
        destino: { name: 'acionamentos' },
      },
      {
        rotulo: 'Aguardando aprovação',
        valor: '3',
        sub: 'Na sua fila',
        destino: { name: 'aprovacoes' },
      },
      { rotulo: 'Taxa de aprovação', valor: '73%', sub: '8 de 11 análises' },
      { rotulo: 'Tempo médio de conclusão', valor: '1h46', sub: 'Do início ao envio' },
      { rotulo: 'Demandas inviáveis', valor: '1', sub: '6% do período' },
    ])
  })

  it('sem dados: zeros, "0 de 0 análises" e travessão no tempo', () => {
    expect(kpisDoPainel(vazio()).map((k) => [k.valor, k.sub])).toEqual([
      ['0', '0 para hoje'],
      ['0', 'Na sua fila'],
      ['0%', '0 de 0 análises'],
      ['—', 'Do início ao envio'],
      ['0', '0% do período'],
    ])
  })

  it('uma análise só fica no singular', () => {
    const p = vazio({ aprovacao: { aprovadas: 1, total: 1 } })
    expect(kpisDoPainel(p)[2]!.sub).toBe('1 de 1 análise')
  })
})

describe('barrasDoVolume', () => {
  it('altura relativa ao maior dia, preenchimento aprovado e rótulos da semana', () => {
    const barras = barrasDoVolume(painelDoSeed())
    expect(barras.map((b) => [b.numero, b.altura, b.alturaAprovados, b.rotulo])).toEqual([
      ['2', '50%', '100%', 'Qua'],
      ['2', '50%', '50%', 'Qui'],
      ['1', '25%', '100%', 'Sex'],
      ['2', '50%', '50%', 'Sáb'],
      ['2', '50%', '100%', 'Dom'],
      ['3', '75%', '0%', 'Seg'],
      ['4', '100%', '0%', 'Ter'],
    ])
    expect(barras.every((b) => b.fundo === '#CCE1F2')).toBe(true)
    expect(barras[0]!.chave).toBe('2026-09-23')
  })

  it('dia vazio vira toco de 4% cinza, sem número; volume pequeno também tem o mínimo', () => {
    const volume = painelDoSeed().volume.map((v, i) => ({
      ...v,
      total: i === 6 ? 30 : i === 5 ? 1 : 0,
      aprovados: 0,
    }))
    const barras = barrasDoVolume({ ...painelDoSeed(), volume })
    expect(barras[0]).toMatchObject({ numero: '', altura: '4%', fundo: '#EFF1F3' })
    expect(barras[5]).toMatchObject({ numero: '1', altura: '4%', fundo: '#CCE1F2' })
  })

  it('em 30 dias, só alguns dias têm rótulo', () => {
    const volume = Array.from({ length: 30 }, (_, i) => ({
      data: new Date(Date.UTC(2026, 7, 31 + i)).toISOString().slice(0, 10),
      total: 1,
      aprovados: 1,
    }))
    const barras = barrasDoVolume({ ...painelDoSeed(), periodo: 30, volume })
    expect(barras.map((b) => b.rotulo).filter(Boolean)).toEqual([
      '31',
      '05',
      '10',
      '15',
      '20',
      '25',
      '29',
    ])
  })
})

describe('linhasDeReprovacao', () => {
  it('taxa sobre as demandas do tipo e largura relativa ao maior', () => {
    expect(linhasDeReprovacao(painelDoSeed())).toEqual([
      { nome: 'Reparo em gesso', taxa: '67% das demandas', total: '2', largura: '100%' },
      { nome: 'Revisão elétrica', taxa: '33% das demandas', total: '1', largura: '50%' },
    ])
  })

  it('12,5% vira 13% e a taxa pode passar de 100%', () => {
    const p = vazio({
      reprovacoesPorTipo: [
        { tipoNome: 'Chaveiro', reprovacoes: 3, demandas: 2 },
        { tipoNome: 'Limpeza de ar-condicionado', reprovacoes: 1, demandas: 8 },
      ],
    })
    expect(linhasDeReprovacao(p).map((l) => l.taxa)).toEqual([
      '150% das demandas',
      '13% das demandas',
    ])
  })
})

describe('linhasDoRanking', () => {
  it('posição ordinal, destaque no primeiro, taxa e tempo formatados', () => {
    const linhas = linhasDoRanking(painelDoSeed())
    expect(
      linhas.map((l) => [l.posicao, l.destaque, l.nome, l.concluidos, l.aprovacao, l.tempo]),
    ).toEqual([
      ['1º', true, 'Carlos Mendes', '3', '80%', '1h09'],
      ['2º', false, 'Ana Ribeiro', '2', '100%', '3h20'],
      ['3º', false, 'João Pires', '1', '50%', '1h23'],
      ['4º', false, 'Marina Costa', '1', '50%', '2h10'],
      ['5º', false, 'Luciana Prado', '0', '—', '—'],
    ])
    expect(linhas[0]).toMatchObject({ id: 'p1', cor: '#0069BD' })
  })
})

describe('itensDaFila', () => {
  const fila: ResumoAcionamento[] = [
    resumo({
      id: 'a1062',
      codigo: 'AC-1062',
      titulo: 'Limpeza de ar-condicionado',
      ultimoEnvioEm: '2026-09-29T11:45:00.000Z',
    }),
    resumo({ id: 'a1059', codigo: 'AC-1059', ultimoEnvioEm: '2026-09-28T13:30:00.000Z' }),
    resumo({
      id: 'a1060',
      codigo: 'AC-1060',
      titulo: 'Pintura da fachada lateral',
      inviavel: true,
      prestador: { id: 'p2', nome: 'Ana Ribeiro', cor: '#FC7608' },
      ultimoEnvioEm: '2026-09-28T19:30:00.000Z',
    }),
  ]

  it('do envio mais antigo para o mais novo, com código e momento do envio', () => {
    expect(itensDaFila(fila)).toEqual([
      {
        id: 'a1059',
        titulo: 'Revisão elétrica e troca de disjuntor',
        linha: 'AC-1059 · Enviado 28/09 · 10:30',
        prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
        status: 'aguardando',
        inviavel: false,
      },
      {
        id: 'a1060',
        titulo: 'Pintura da fachada lateral',
        linha: 'AC-1060 · Enviado 28/09 · 16:30',
        prestador: { id: 'p2', nome: 'Ana Ribeiro', cor: '#FC7608' },
        status: 'aguardando',
        inviavel: true,
      },
      {
        id: 'a1062',
        titulo: 'Limpeza de ar-condicionado',
        linha: 'AC-1062 · Enviado 29/09 · 08:45',
        prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
        status: 'aguardando',
        inviavel: false,
      },
    ])
  })

  it('mostra só os 4 primeiros', () => {
    const muitos = Array.from({ length: 6 }, (_, i) =>
      resumo({ id: `a${i}`, ultimoEnvioEm: `2026-09-2${i}T12:00:00.000Z` }),
    )
    expect(itensDaFila(muitos).map((i) => i.id)).toEqual(['a0', 'a1', 'a2', 'a3'])
  })
})

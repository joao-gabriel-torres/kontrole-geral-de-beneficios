import type { ResumoAcionamento } from '@kgb/api-client'
import { describe, expect, it } from 'vitest'
import { cartoesMetricas, paradasDaRota, rotuloProximo } from './inicio'

const metricas = (extra = {}) => ({
  hoje: 3,
  noMes: 7,
  aprovacao: { taxa: 83, dePrimeira: 75 },
  paraCorrigir: 0,
  ...extra,
})

describe('métricas do Início', () => {
  it('monta os quatro cartões na ordem do protótipo', () => {
    expect(cartoesMetricas(metricas())).toEqual([
      { rotulo: 'Hoje', valor: '3', sub: 'atendimentos', destaque: false },
      { rotulo: 'No mês', valor: '7', sub: 'aprovados', destaque: false },
      { rotulo: 'Aprovação', valor: '83%', sub: 'de primeira: 75%', destaque: false },
      { rotulo: 'Para corrigir', valor: '0', sub: 'reprovados', destaque: false },
    ])
  })

  it('sem revisões, "de primeira" mostra um travessão', () => {
    const aprovacao = cartoesMetricas(metricas({ aprovacao: { taxa: 0, dePrimeira: null } }))[2]!
    expect(aprovacao).toMatchObject({ valor: '0%', sub: 'de primeira: —' })
  })

  it('"Para corrigir" ganha destaque quando há reprovados', () => {
    expect(cartoesMetricas(metricas({ paraCorrigir: 2 }))[3]).toEqual({
      rotulo: 'Para corrigir',
      valor: '2',
      sub: 'reprovados',
      destaque: true,
    })
  })
})

describe('rótulo do próximo atendimento', () => {
  it('diz "Em execução agora" quando o atendimento já começou', () => {
    expect(rotuloProximo('em_andamento')).toBe('Em execução agora')
    expect(rotuloProximo('aberto')).toBe('Próximo atendimento')
  })
})

describe('paradas da rota do dia', () => {
  const acionamento = (
    id: string,
    endereco: string,
    status: ResumoAcionamento['status'],
    latitude: number | null = null,
    longitude: number | null = null,
  ) => ({ id, endereco, status, latitude, longitude })

  it('cada endereço da rota leva a posição conferida do acionamento de hoje, quando há', () => {
    const hoje = [
      acionamento('1', 'Rua A, 1 · Centro', 'aprovado', -23.1, -46.1),
      acionamento('2', 'Rua A, 1 · Centro', 'aberto', -23.2, -46.2),
      acionamento('3', 'Rua B, 2 · Sé', 'em_andamento'),
      acionamento('4', 'Rua C, 3 · Sé', 'aberto', -23.4, -46.4),
    ]
    expect(paradasDaRota(['Rua A, 1 · Centro', 'Rua B, 2 · Sé', 'Rua C, 3 · Sé'], hoje)).toEqual([
      { endereco: 'Rua A, 1 · Centro', latitude: -23.2, longitude: -46.2 },
      'Rua B, 2 · Sé',
      { endereco: 'Rua C, 3 · Sé', latitude: -23.4, longitude: -46.4 },
    ])
  })

  it('o mesmo endereço duas vezes pega um acionamento por vez, na ordem', () => {
    const hoje = [
      acionamento('1', 'Rua A, 1 · Centro', 'aberto', -23.1, -46.1),
      acionamento('2', 'Rua A, 1 · Centro', 'aberto'),
    ]
    expect(paradasDaRota(['Rua A, 1 · Centro', 'Rua A, 1 · Centro'], hoje)).toEqual([
      { endereco: 'Rua A, 1 · Centro', latitude: -23.1, longitude: -46.1 },
      'Rua A, 1 · Centro',
    ])
  })

  it('endereço sem acionamento correspondente vai como veio', () => {
    expect(paradasDaRota(['Rua Z, 9 · Sé'], [])).toEqual(['Rua Z, 9 · Sé'])
  })
})

import { describe, expect, it } from 'vitest'
import { cartoesMetricas, rotuloProximo } from './inicio'

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

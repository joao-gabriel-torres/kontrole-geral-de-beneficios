import { describe, expect, it } from 'vitest'
import { calcularInicio, type ItemAgenda } from './inicio-prestador'

const item = (p: Partial<ItemAgenda> & Pick<ItemAgenda, 'id'>): ItemAgenda => ({
  data: '2026-09-28',
  inicio: '09:00',
  status: 'aberto',
  inviavel: false,
  endereco: `Endereço ${p.id}`,
  revisoes: [],
  ...p,
})

describe('calcularInicio', () => {
  it('o próximo é o que está em execução, mesmo que outro seja mais cedo', () => {
    const r = calcularInicio(
      [
        item({ id: 'a', inicio: '08:00' }),
        item({ id: 'b', inicio: '10:00', status: 'em_andamento' }),
      ],
      '2026-09-28',
    )
    expect(r.proximoId).toBe('b')
  })

  it('sem execução, é o primeiro agendado de hoje em diante (ignora os atrasados)', () => {
    const r = calcularInicio(
      [
        item({ id: 'ontem', data: '2026-09-27' }),
        item({ id: 'amanha', data: '2026-09-29', inicio: '07:00' }),
        item({ id: 'hoje-tarde', inicio: '15:00' }),
        item({ id: 'hoje-cedo', inicio: '10:30' }),
      ],
      '2026-09-28',
    )
    expect(r.proximoId).toBe('hoje-cedo')
  })

  it('lista os de hoje em ordem de horário e monta a rota só com os pendentes', () => {
    const r = calcularInicio(
      [
        item({ id: 'b', inicio: '10:30' }),
        item({ id: 'a', inicio: '07:30', status: 'aguardando' }),
        item({ id: 'c', inicio: '15:00', status: 'em_andamento' }),
      ],
      '2026-09-28',
    )
    expect(r.hojeIds).toEqual(['a', 'b', 'c'])
    expect(r.rotaDoDia).toEqual(['Endereço b', 'Endereço c'])
    expect(r.metricas.hoje).toBe(3)
  })

  it('calcula as métricas como o protótipo', () => {
    const r = calcularInicio(
      [
        item({ id: '1', data: '2026-09-10', status: 'aprovado', revisoes: ['aprovado'] }),
        item({
          id: '2',
          data: '2026-09-11',
          status: 'aprovado',
          revisoes: ['reprovado', 'aprovado'],
        }),
        item({
          id: '3',
          data: '2026-09-12',
          status: 'aprovado',
          inviavel: true,
          revisoes: ['aprovado'],
        }),
        item({ id: '4', data: '2026-08-30', status: 'aprovado', revisoes: ['aprovado'] }),
        item({ id: '5', data: '2026-09-27', status: 'reprovado', revisoes: ['reprovado'] }),
      ],
      '2026-09-28',
    )
    expect(r.metricas.noMes).toBe(2)
    expect(r.metricas.aprovacao).toEqual({ taxa: 67, dePrimeira: 60 })
    expect(r.metricas.paraCorrigir).toBe(1)
  })

  it('sem revisões, a aprovação de primeira fica indefinida', () => {
    expect(calcularInicio([item({ id: 'x' })], '2026-09-28').metricas.aprovacao).toEqual({
      taxa: 0,
      dePrimeira: null,
    })
  })
})

import type { ResumoAcionamento } from '@kgb/api-client'
import { describe, expect, it } from 'vitest'
import { contar, FILTROS, filtrar, filtroDaQuery, ordenarPorData } from './filtros'

type Status = ResumoAcionamento['status']
const acionamento = (id: string, status: Status, data: string, inicio = '09:00') =>
  ({ id, status, data, inicio }) as ResumoAcionamento

const lista = [
  acionamento('aprovado-antigo', 'aprovado', '2026-09-01'),
  acionamento('aberto-amanha', 'aberto', '2026-09-29'),
  acionamento('aguardando', 'aguardando', '2026-09-27'),
  acionamento('andamento-hoje', 'em_andamento', '2026-09-28', '07:30'),
  acionamento('reprovado', 'reprovado', '2026-09-26'),
  acionamento('aberto-hoje', 'aberto', '2026-09-28', '10:30'),
  acionamento('aprovado-recente', 'aprovado', '2026-09-20'),
]
const ids = (l: readonly ResumoAcionamento[]) => l.map((a) => a.id)

describe('filtros de Demandas', () => {
  it('tem os quatro filtros do protótipo, nesta ordem', () => {
    expect(FILTROS.map((f) => f.rotulo)).toEqual([
      'Ativas',
      'Corrigir',
      'Em análise',
      'Finalizadas',
    ])
  })

  it('ordena por data e horário, do mais antigo para o mais novo', () => {
    expect(ids(ordenarPorData(lista))).toEqual([
      'aprovado-antigo',
      'aprovado-recente',
      'reprovado',
      'aguardando',
      'andamento-hoje',
      'aberto-hoje',
      'aberto-amanha',
    ])
  })

  it('Ativas junta abertos e em execução, em ordem de data', () => {
    expect(ids(filtrar(lista, 'ativas'))).toEqual([
      'andamento-hoje',
      'aberto-hoje',
      'aberto-amanha',
    ])
  })

  it('Corrigir tem os reprovados e Em análise os aguardando', () => {
    expect(ids(filtrar(lista, 'corrigir'))).toEqual(['reprovado'])
    expect(ids(filtrar(lista, 'analise'))).toEqual(['aguardando'])
  })

  it('Finalizadas mostra os aprovados do mais recente para o mais antigo, no máximo 20', () => {
    expect(ids(filtrar(lista, 'finalizadas'))).toEqual(['aprovado-recente', 'aprovado-antigo'])
    const muitos = Array.from({ length: 25 }, (_, i) =>
      acionamento(`f${i}`, 'aprovado', `2026-08-${String(i + 1).padStart(2, '0')}`),
    )
    const finalizadas = filtrar(muitos, 'finalizadas')
    expect(finalizadas).toHaveLength(20)
    expect(finalizadas[0]!.id).toBe('f24')
    expect(finalizadas.at(-1)!.id).toBe('f5')
  })

  it('a contagem de cada chip não é limitada a 20', () => {
    const muitos = Array.from({ length: 25 }, (_, i) =>
      acionamento(`f${i}`, 'aprovado', '2026-08-01'),
    )
    expect(contar([...lista, ...muitos])).toEqual({
      ativas: 3,
      corrigir: 1,
      analise: 1,
      finalizadas: 27,
    })
  })

  it('lê o filtro da query e cai em Ativas com valor desconhecido', () => {
    expect(filtroDaQuery('corrigir')).toBe('corrigir')
    expect(filtroDaQuery('finalizadas')).toBe('finalizadas')
    expect(filtroDaQuery('xpto')).toBe('ativas')
    expect(filtroDaQuery(undefined)).toBe('ativas')
    expect(filtroDaQuery(['analise'])).toBe('ativas')
  })
})

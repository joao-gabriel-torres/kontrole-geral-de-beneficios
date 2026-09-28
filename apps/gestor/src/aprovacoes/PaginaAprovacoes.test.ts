import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { resumo } from '../../test/fixtures'
import { montar } from '../../test/montar'
import { api } from '../api'
import PaginaAprovacoes from './PaginaAprovacoes.vue'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('PaginaAprovacoes', () => {
  let fila: ReturnType<typeof resumo>[]
  let simulada: ReturnType<typeof simularApi>
  beforeEach(() => {
    fila = [
      resumo({
        id: 'a1062',
        codigo: 'AC-1062',
        titulo: 'Limpeza de ar-condicionado',
        cliente: 'Clínica Vida',
        tipos: [{ nome: 'Limpeza de ar-condicionado', cor: '#8FB8DE' }],
        ultimoEnvioEm: '2026-09-28T11:45:00.000Z',
      }),
      resumo({ ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }),
    ]
    simulada = simularApi(api, { 'GET /api/acionamentos': () => ({ data: fila }) })
  })

  it('consulta só o que aguarda aprovação', async () => {
    await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    expect(simulada.chamadas('GET', '/api/acionamentos')[0]!.params!.query).toEqual({
      status: 'aguardando',
      busca: undefined,
    })
  })

  it('mostra os cartões, do envio mais antigo para o mais novo', async () => {
    const { tela } = await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    const cartoes = tela.findAll('a.cartao')
    expect(cartoes.map((c) => c.find('.codigo').text())).toEqual(['AC-1059', 'AC-1062'])
    const primeiro = cartoes[0]!
    expect(primeiro.find('.titulo').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(primeiro.find('.sub').text()).toBe(
      'Colégio Aprender · Revisão elétrica + Troca de disjuntor',
    )
    expect(primeiro.find('.topo').text()).toContain('Aguardando aprovação')
    expect(primeiro.find('.nome').text()).toBe('Carlos Mendes')
    expect(primeiro.find('.enviado').text()).toBe('Enviado 27/09 · 10:30')
    expect(primeiro.find('.analisar').text()).toBe('Analisar')
    expect(primeiro.attributes('href')).toBe('/aprovacoes/a1059')
  })

  it('fila vazia mostra o aviso do protótipo', async () => {
    fila = []
    const { tela } = await montar(PaginaAprovacoes, { rota: '/aprovacoes' })
    expect(tela.find('.vazio').text()).toBe('Sua fila está vazia.')
    expect(tela.findAll('a.cartao')).toHaveLength(0)
  })
})

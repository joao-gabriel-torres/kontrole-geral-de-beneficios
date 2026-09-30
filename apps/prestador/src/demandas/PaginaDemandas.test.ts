import type { ResumoAcionamento } from '@kgb/api-client'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'

const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } }))
vi.mock('../api', () => ({ api, baseApi: 'http://api' }))
const { default: PaginaDemandas } = await import('./PaginaDemandas.vue')

const resumo = (
  id: string,
  status: ResumoAcionamento['status'],
  extra = {},
): ResumoAcionamento => ({
  id,
  codigo: `AC-${id}`,
  titulo: `Serviço ${id}`,
  cliente: 'Edifício Aurora',
  endereco: 'Rua Bela Cintra, 1200 · Consolação',
  data: '2026-01-05',
  inicio: '09:00',
  fim: '10:00',
  status,
  inviavel: false,
  prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
  tipos: [
    { nome: 'Vazamento', cor: '#0069BD' },
    { nome: 'Reparo em gesso', cor: '#E0A100' },
  ],
  etapas: { feitas: 3, total: 9 },
  ultimoEnvioEm: null,
  latitude: null,
  longitude: null,
  ...extra,
})
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) })

describe('PaginaDemandas', () => {
  beforeEach(() => {
    api.GET.mockReset()
    api.GET.mockResolvedValue(
      ok([resumo('1', 'aberto'), resumo('2', 'em_andamento'), resumo('3', 'reprovado')]),
    )
  })

  it('busca os acionamentos do prestador e mostra a contagem em cada chip', async () => {
    const { wrapper } = await montar(PaginaDemandas, { rotaInicial: '/demandas' })
    expect(api.GET).toHaveBeenCalledWith('/api/acionamentos')
    const chips = wrapper
      .findAll('.chip-filtro')
      .map((c) => [c.text().replace(c.find('.contagem').text(), ''), c.find('.contagem').text()])
    expect(chips).toEqual([
      ['Ativas', '2'],
      ['Corrigir', '1'],
      ['Em análise', '0'],
      ['Finalizadas', '0'],
    ])
    expect(wrapper.find('.chip-filtro.ativo').text()).toContain('Ativas')
  })

  it('mostra o cartão com código, quando, título, cliente, tipos, progresso e status', async () => {
    const { wrapper } = await montar(PaginaDemandas, { rotaInicial: '/demandas' })
    const cartao = wrapper.findAll('.cartao')[0]!
    expect(cartao.find('.meta').text()).toBe('AC-1 · 05/01 · 09:00–10:00')
    expect(cartao.find('.titulo-cartao').text()).toBe('Serviço 1')
    expect(cartao.find('.cliente').text()).toBe('Edifício Aurora · Vazamento + Reparo em gesso')
    expect(cartao.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('33')
    expect(cartao.text()).toContain('Agendado')
  })

  it('usa o filtro da query (atalhos do Início)', async () => {
    const { wrapper } = await montar(PaginaDemandas, { rotaInicial: '/demandas?filtro=corrigir' })
    expect(wrapper.find('.chip-filtro.ativo').text()).toContain('Corrigir')
    expect(wrapper.findAll('.cartao')).toHaveLength(1)
  })

  it('trocar de chip grava o filtro na query', async () => {
    const { wrapper, router } = await montar(PaginaDemandas, { rotaInicial: '/demandas' })
    await wrapper.findAll('.chip-filtro')[2]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.filtro).toBe('analise')
    expect(wrapper.find('.vazio').text()).toBe('Nada por aqui.')
  })

  it('o chip ativo é anunciado como pressionado', async () => {
    const { wrapper } = await montar(PaginaDemandas, { rotaInicial: '/demandas?filtro=corrigir' })
    expect(wrapper.findAll('.chip-filtro').map((c) => c.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ])
  })

  it('Espaço no cartão abre o detalhe, sem rolar a página', async () => {
    const { wrapper, router } = await montar(PaginaDemandas, { rotaInicial: '/demandas' })
    const espaco = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    wrapper.findAll('.cartao')[1]!.element.dispatchEvent(espaco)
    await flushPromises()
    expect(espaco.defaultPrevented).toBe(true)
    expect(router.currentRoute.value.name).toBe('detalhe')
    expect(router.currentRoute.value.params.id).toBe('2')
  })

  it('tocar no cartão abre o detalhe', async () => {
    const { wrapper, router } = await montar(PaginaDemandas, { rotaInicial: '/demandas' })
    await wrapper.findAll('.cartao')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('detalhe')
    expect(router.currentRoute.value.params.id).toBe('2')
  })
})

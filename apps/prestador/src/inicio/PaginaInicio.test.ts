import type { InicioPrestador, ResumoAcionamento } from '@kgb/api-client'
import { dataISO, urlMapa, urlRota } from '@kgb/ui'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'

const { sair, api, reiniciarAgenda } = vi.hoisted(() => ({
  sair: vi.fn(async () => {}),
  api: { GET: vi.fn() },
  reiniciarAgenda: vi.fn(),
}))
vi.mock('../sessao', () => ({
  sessao: { usuario: { nome: 'Carlos Mendes' }, carregada: true, indisponivel: false },
  sair,
}))
vi.mock('../api', () => ({ api, baseApi: 'http://api' }))
vi.mock('../agenda/usarAgenda', () => ({ reiniciarAgenda }))
const { default: PaginaInicio } = await import('./PaginaInicio.vue')

const hoje = dataISO(new Date())
const resumo = (id: string, extra: Partial<ResumoAcionamento> = {}): ResumoAcionamento => ({
  id,
  codigo: `AC-${id}`,
  titulo: 'Vazamento no teto do banheiro',
  cliente: 'Edifício Aurora',
  endereco: 'Rua Bela Cintra, 1200 · Consolação',
  data: hoje,
  inicio: '10:30',
  fim: '12:30',
  status: 'aberto',
  inviavel: false,
  prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
  tipos: [{ nome: 'Vazamento', cor: '#0069BD' }],
  etapas: { feitas: 0, total: 9 },
  ultimoEnvioEm: null,
  latitude: null,
  longitude: null,
  ...extra,
})
const inicio = (extra: Partial<InicioPrestador> = {}): InicioPrestador => ({
  proximo: resumo('1063'),
  hoje: [
    resumo('1062', {
      inicio: '07:30',
      titulo: 'Limpeza de ar-condicionado',
      status: 'aguardando',
      cliente: 'Clínica Vida',
    }),
    resumo('1063'),
  ],
  metricas: { hoje: 2, noMes: 7, aprovacao: { taxa: 83, dePrimeira: null }, paraCorrigir: 1 },
  rotaDoDia: ['Rua Bela Cintra, 1200 · Consolação', 'Av. Paulista, 900 · Bela Vista'],
  ...extra,
})
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) })

describe('PaginaInicio', () => {
  beforeEach(() => {
    api.GET.mockReset()
    api.GET.mockResolvedValue(ok(inicio()))
  })
  afterEach(() => vi.restoreAllMocks())

  it('cumprimenta pelo primeiro nome', async () => {
    const { wrapper } = await montar(PaginaInicio)
    expect(wrapper.find('h1').text()).toMatch(/^(Bom dia|Boa tarde|Boa noite), Carlos$/)
  })

  it('o avatar abre o menu e "Sair" encerra a sessão e volta ao login', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    await wrapper.find('.gatilho').trigger('click')
    await wrapper.find('[role="menuitem"]').trigger('click')
    await flushPromises()
    expect(sair).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('sair não deixa o cache nem a escolha da Agenda para o próximo login', async () => {
    const { wrapper, cliente } = await montar(PaginaInicio)
    cliente.setQueryData(['acionamentos'], ['lista da conta anterior'])
    await wrapper.find('.gatilho').trigger('click')
    await wrapper.find('[role="menuitem"]').trigger('click')
    await flushPromises()
    expect(cliente.getQueryData(['acionamentos'])).toBeUndefined()
    expect(reiniciarAgenda).toHaveBeenCalled()
  })

  it('mostra o próximo atendimento com rota e atalho para o checklist', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    expect(api.GET).toHaveBeenCalledWith('/api/prestador/inicio')
    const cartao = wrapper.find('.proximo')
    expect(cartao.find('.selo').text()).toBe('Próximo atendimento')
    expect(cartao.find('.codigo').text()).toBe('AC-1063')
    expect(cartao.find('.quando').text()).toBe('Hoje · 10:30–12:30')
    expect(cartao.find('.titulo-proximo').text()).toBe('Vazamento no teto do banheiro')
    expect(cartao.find('.local').text()).toBe(
      'Edifício Aurora · Rua Bela Cintra, 1200 · Consolação',
    )
    const rota = cartao.find('a.rota')
    expect(rota.attributes('href')).toBe(urlMapa('Rua Bela Cintra, 1200 · Consolação'))
    expect(rota.attributes('target')).toBe('_blank')
    await cartao.find('button.abrir').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({ name: 'detalhe', params: { id: '1063' } })
  })

  it('sem próximo atendimento, avisa que a agenda está livre', async () => {
    api.GET.mockResolvedValue(ok(inicio({ proximo: null })))
    const { wrapper } = await montar(PaginaInicio)
    expect(wrapper.find('.proximo').exists()).toBe(false)
    expect(wrapper.find('.sem-proximo').text()).toBe('Nenhum atendimento pendente na sua agenda.')
  })

  it('"Em execução agora" quando o próximo já começou', async () => {
    const emExecucao = resumo('1063', { status: 'em_andamento' })
    api.GET.mockResolvedValue(ok(inicio({ proximo: emExecucao })))
    const { wrapper } = await montar(PaginaInicio)
    expect(wrapper.find('.proximo .selo').text()).toBe('Em execução agora')
  })

  it('"Corrigir" mostra o badge e abre Demandas no filtro Corrigir', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    const corrigir = wrapper.findAll('.atalho').find((a) => a.text().startsWith('Corrigir'))!
    expect(corrigir.find('.badge').text()).toBe('1')
    await corrigir.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      name: 'demandas',
      query: { filtro: 'corrigir' },
    })
  })

  it('"Em análise" abre Demandas no filtro Em análise e "Agenda" vai para a aba Agenda', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    const atalho = (nome: string) => wrapper.findAll('.atalho').find((a) => a.text() === nome)!
    expect(atalho('Em análise').find('.badge').exists()).toBe(false)
    await atalho('Em análise').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      name: 'demandas',
      query: { filtro: 'analise' },
    })
    await atalho('Agenda').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('agenda')
  })

  it('"Rota do dia" abre o Google Maps com os endereços pendentes de hoje', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null)
    const { wrapper } = await montar(PaginaInicio)
    await wrapper.findAll('.atalho')[0]!.trigger('click')
    expect(abrir).toHaveBeenCalledWith(
      urlRota(['Rua Bela Cintra, 1200 · Consolação', 'Av. Paulista, 900 · Bela Vista']),
      '_blank',
    )
  })

  it('"Rota do dia" não faz nada sem endereços pendentes', async () => {
    api.GET.mockResolvedValue(ok(inicio({ rotaDoDia: [] })))
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null)
    const { wrapper } = await montar(PaginaInicio)
    await wrapper.findAll('.atalho')[0]!.trigger('click')
    expect(abrir).not.toHaveBeenCalled()
  })

  it('mostra as métricas, com destaque em "Para corrigir"', async () => {
    const { wrapper } = await montar(PaginaInicio)
    const metricas = wrapper.findAll('.metrica')
    expect(metricas.map((m) => m.find('.valor').text())).toEqual(['2', '7', '83%', '1'])
    expect(metricas[2]!.find('.sub').text()).toBe('de primeira: —')
    expect(metricas[3]!.classes()).toContain('destaque')
    expect(metricas[0]!.classes()).not.toContain('destaque')
  })

  it('lista a agenda de hoje e abre o detalhe ao tocar', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    const itens = wrapper.findAll('.item-hoje')
    expect(itens.map((i) => i.find('.hora').text())).toEqual(['07:30', '10:30'])
    expect(itens[0]!.text()).toContain('Limpeza de ar-condicionado')
    expect(itens[0]!.text()).toContain('Clínica Vida')
    expect(itens[0]!.text()).toContain('Aguardando aprovação')
    await itens[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.id).toBe('1062')
  })

  it('Espaço no item da agenda de hoje abre o detalhe, sem rolar a página', async () => {
    const { wrapper, router } = await montar(PaginaInicio)
    const espaco = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    wrapper.findAll('.item-hoje')[1]!.element.dispatchEvent(espaco)
    await flushPromises()
    expect(espaco.defaultPrevented).toBe(true)
    expect(router.currentRoute.value.params.id).toBe('1063')
  })

  it('sem nada hoje, diz "Nada agendado para hoje."', async () => {
    api.GET.mockResolvedValue(ok(inicio({ hoje: [] })))
    const { wrapper } = await montar(PaginaInicio)
    expect(wrapper.find('.nada-hoje').text()).toBe('Nada agendado para hoje.')
  })
})

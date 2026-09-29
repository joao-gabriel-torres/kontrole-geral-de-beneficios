import type { ResumoAcionamento } from '@kgb/api-client'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'
import { CHAVES } from '../consultas'

const { api, sessao } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  sessao: { usuario: { id: 'u-carlos' } as { id: string } | null },
}))
vi.mock('../api', () => ({ api, baseApi: 'http://api' }))
vi.mock('../sessao', () => ({ sessao }))
const { default: PaginaAgenda } = await import('./PaginaAgenda.vue')
const { INTERVALO_RELOGIO, reiniciarAgenda } = await import('./usarAgenda')

const resumo = (id: string, extra: Partial<ResumoAcionamento> = {}): ResumoAcionamento => ({
  id,
  codigo: id,
  titulo: 'Vazamento no teto do banheiro',
  cliente: 'Edifício Aurora',
  endereco: 'Rua Bela Cintra, 1200 · Consolação',
  data: '2026-09-29',
  inicio: '10:30',
  fim: '12:30',
  status: 'aberto',
  inviavel: false,
  prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
  tipos: [
    { nome: 'Vazamento', cor: '#0069BD' },
    { nome: 'Reparo em gesso', cor: '#F47B50' },
  ],
  etapas: { feitas: 0, total: 9 },
  ultimoEnvioEm: null,
  ...extra,
})

/** O seed do Carlos na faixa de 29/09, na ordem da API (data desc, início desc), e dois de fora. */
const LISTA: ResumoAcionamento[] = [
  resumo('1030', { data: '2026-10-06', inicio: '09:00', titulo: 'Fora da faixa' }),
  resumo('1019', {
    data: '2026-10-01',
    inicio: '08:30',
    fim: '10:00',
    titulo: 'Troca de disjuntores do quadro',
    endereco: 'Rua Mourato Coelho, 300 · Pinheiros',
    tipos: [{ nome: 'Troca de disjuntor', cor: '#FFB523' }],
  }),
  resumo('1018', {
    data: '2026-09-30',
    inicio: '13:00',
    fim: '17:00',
    titulo: 'Pintura e reparo em gesso',
  }),
  resumo('1017', {
    data: '2026-09-30',
    inicio: '09:00',
    fim: '10:00',
    titulo: 'Troca de cilindro e cópias',
  }),
  resumo('1015', { inicio: '15:00', fim: '16:30', titulo: 'Ponto de luz na recepção' }),
  resumo('1014'),
  resumo('1013', {
    inicio: '07:30',
    fim: '09:00',
    titulo: 'Limpeza de ar-condicionado',
    endereco: 'Rua Pamplona, 145 · Jardim Paulista',
    status: 'aguardando',
    tipos: [{ nome: 'Limpeza de ar-condicionado', cor: '#47C272' }],
  }),
  resumo('1010', { data: '2026-09-28', status: 'reprovado', titulo: 'Ontem' }),
]
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) })

const montados: VueWrapper[] = []
async function abrirAgenda() {
  const r = await montar(PaginaAgenda, { rotaInicial: '/agenda' })
  montados.push(r.wrapper)
  return r
}
const botoes = (w: VueWrapper) => w.findAll('.dia')
const nomes = (w: VueWrapper) =>
  botoes(w).map((b) => `${b.find('.dia-semana').text()} ${b.find('.numero').text()}`)
const rotulo = (w: VueWrapper) => w.find('.rotulo-dia').text()
const horas = (w: VueWrapper) => w.findAll('.hora').map((h) => h.text())

describe('PaginaAgenda', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-09-29T12:00:00-03:00'))
    sessao.usuario = { id: 'u-carlos' }
    reiniciarAgenda()
    api.GET.mockReset()
    api.GET.mockResolvedValue(ok(LISTA))
  })
  afterEach(() => {
    montados.splice(0).forEach((w) => w.unmount())
    vi.useRealTimers()
  })

  it('mostra o título e a faixa de 7 dias a partir de hoje, com hoje escolhido', async () => {
    const { wrapper } = await abrirAgenda()
    expect(wrapper.find('h1').text()).toBe('Agenda')
    expect(nomes(wrapper)).toEqual([
      'Ter 29',
      'Qua 30',
      'Qui 1',
      'Sex 2',
      'Sáb 3',
      'Dom 4',
      'Seg 5',
    ])
    expect(botoes(wrapper).map((b) => b.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
    ])
    expect(botoes(wrapper)[0]!.classes()).toContain('selecionado')
    expect(rotulo(wrapper)).toBe('Hoje, 29/09')
  })

  it('os botões do dia são nativos e sem aria-label (o nome acessível vem do texto)', async () => {
    const { wrapper } = await abrirAgenda()
    expect(botoes(wrapper)).toHaveLength(7)
    for (const b of botoes(wrapper)) {
      expect(b.element.tagName).toBe('BUTTON')
      expect(b.attributes('type')).toBe('button')
      expect(b.attributes('aria-label')).toBeUndefined()
    }
  })

  it('marca com ponto só os dias da faixa com atendimento, de qualquer status', async () => {
    const { wrapper } = await abrirAgenda()
    expect(botoes(wrapper).map((b) => b.classes().includes('com-atendimento'))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ])
  })

  it('escolher outro dia troca o rótulo e a seleção', async () => {
    const { wrapper } = await abrirAgenda()
    await botoes(wrapper)[1]!.trigger('click')
    expect(rotulo(wrapper)).toBe('Amanhã, 30/09')
    expect(botoes(wrapper)[1]!.attributes('aria-pressed')).toBe('true')
    expect(botoes(wrapper)[0]!.attributes('aria-pressed')).toBe('false')
    await botoes(wrapper)[2]!.trigger('click')
    expect(rotulo(wrapper)).toBe('Quinta-feira, 01/10')
    await botoes(wrapper)[6]!.trigger('click')
    expect(rotulo(wrapper)).toBe('Segunda-feira, 05/10')
  })

  it('o dia escolhido sobrevive a sair da tela e voltar (Detalhe, outra aba)', async () => {
    const primeira = await abrirAgenda()
    await botoes(primeira.wrapper)[1]!.trigger('click')
    primeira.wrapper.unmount()
    const { wrapper } = await abrirAgenda()
    expect(rotulo(wrapper)).toBe('Amanhã, 30/09')
  })

  it('outro login volta para hoje', async () => {
    const primeira = await abrirAgenda()
    await botoes(primeira.wrapper)[1]!.trigger('click')
    primeira.wrapper.unmount()
    sessao.usuario = { id: 'u-outro' }
    const { wrapper } = await abrirAgenda()
    expect(rotulo(wrapper)).toBe('Hoje, 29/09')
  })

  it('na virada do dia, a faixa anda sozinha e o dia que saiu dela volta para hoje', async () => {
    vi.setSystemTime(new Date('2026-09-29T23:59:50-03:00'))
    const { wrapper } = await abrirAgenda()
    await botoes(wrapper)[0]!.trigger('click')
    vi.advanceTimersByTime(INTERVALO_RELOGIO)
    await wrapper.vm.$nextTick()
    expect(nomes(wrapper)[0]).toBe('Qua 30')
    expect(nomes(wrapper)[6]).toBe('Ter 6')
    expect(rotulo(wrapper)).toBe('Hoje, 30/09')
  })

  it('na virada do dia, um dia escolhido que continua na faixa continua escolhido', async () => {
    vi.setSystemTime(new Date('2026-09-29T23:59:50-03:00'))
    const { wrapper } = await abrirAgenda()
    await botoes(wrapper)[2]!.trigger('click')
    vi.advanceTimersByTime(INTERVALO_RELOGIO)
    await wrapper.vm.$nextTick()
    expect(rotulo(wrapper)).toBe('Amanhã, 01/10')
    expect(botoes(wrapper)[1]!.attributes('aria-pressed')).toBe('true')
  })

  it('enquanto carrega, mostra a faixa sem pontos e o rótulo, sem "Dia livre."', async () => {
    api.GET.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await abrirAgenda()
    expect(botoes(wrapper)).toHaveLength(7)
    expect(wrapper.findAll('.com-atendimento')).toHaveLength(0)
    expect(rotulo(wrapper)).toBe('Hoje, 29/09')
    expect(wrapper.text()).not.toContain('Dia livre.')
  })

  it('lista os acionamentos de hoje por início, com hora, título, horário e tipos, endereço e chip', async () => {
    const { wrapper } = await abrirAgenda()
    expect(api.GET).toHaveBeenCalledWith('/api/acionamentos')
    expect(horas(wrapper)).toEqual(['07:30', '10:30', '15:00'])
    const [primeiro, segundo] = wrapper.findAll('.cartao')
    expect(primeiro!.find('.titulo-cartao').text()).toBe('Limpeza de ar-condicionado')
    expect(primeiro!.find('.horario').text()).toBe('07:30–09:00 · Limpeza de ar-condicionado')
    expect(primeiro!.find('.endereco').text()).toBe('Rua Pamplona, 145 · Jardim Paulista')
    expect(primeiro!.find('.endereco svg').exists()).toBe(true)
    expect(primeiro!.find('.chip').text()).toBe('Aguardando aprovação')
    expect(segundo!.find('.horario').text()).toBe('10:30–12:30 · Vazamento + Reparo em gesso')
    expect(segundo!.find('.chip').text()).toBe('Agendado')
    expect(wrapper.text()).not.toContain('Dia livre.')
  })

  it('usa a mesma consulta de Demandas (as mutações do Detalhe atualizam a Agenda)', async () => {
    const { cliente } = await abrirAgenda()
    expect(cliente.getQueryData(CHAVES.lista)).toEqual(LISTA)
  })

  it('entram todos os status, inclusive reprovado, aprovado e inviável', async () => {
    api.GET.mockResolvedValue(
      ok([
        resumo('2', { inicio: '09:00', status: 'aprovado', inviavel: true }),
        resumo('1', { inicio: '08:00', status: 'reprovado' }),
        resumo('3', { inicio: '10:00', status: 'em_andamento' }),
        resumo('4', { inicio: '11:00', status: 'aprovado' }),
      ]),
    )
    const { wrapper } = await abrirAgenda()
    expect(wrapper.findAll('.chip').map((c) => c.text())).toEqual([
      'Reprovado',
      'Inviável',
      'Em execução',
      'Aprovado',
    ])
  })

  it('escolher outro dia mostra a lista dele; dia sem nada mostra "Dia livre."', async () => {
    const { wrapper } = await abrirAgenda()
    await botoes(wrapper)[1]!.trigger('click')
    expect(horas(wrapper)).toEqual(['09:00', '13:00'])
    await botoes(wrapper)[3]!.trigger('click')
    expect(rotulo(wrapper)).toBe('Sexta-feira, 02/10')
    expect(wrapper.findAll('.linha')).toHaveLength(0)
    expect(wrapper.find('.livre').text()).toBe('Dia livre.')
  })

  it('o cartão abre o Detalhe pelo clique e pelo teclado; a hora não abre', async () => {
    const { wrapper, router } = await abrirAgenda()
    await wrapper.findAll('.hora')[0]!.trigger('click')
    expect(router.currentRoute.value.name).toBe('agenda')
    await wrapper.findAll('.cartao')[0]!.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.params.id).toBe('1013'))
    expect(router.currentRoute.value.name).toBe('detalhe')
    await router.push('/agenda')
    await wrapper.findAll('.cartao')[1]!.trigger('keydown', { key: 'Enter' })
    await vi.waitFor(() => expect(router.currentRoute.value.params.id).toBe('1014'))
    await router.push('/agenda')
    await wrapper.findAll('.cartao')[2]!.trigger('keydown', { key: ' ' })
    await vi.waitFor(() => expect(router.currentRoute.value.params.id).toBe('1015'))
  })

  it('erro ao carregar mostra a mensagem da API no lugar da lista, sem "Dia livre."', async () => {
    api.GET.mockResolvedValue({
      data: undefined,
      error: { erro: { codigo: 'erro_interno', mensagem: 'Serviço indisponível' } },
      response: new Response(null, { status: 503 }),
    })
    const { wrapper } = await abrirAgenda()
    await vi.waitFor(() => expect(wrapper.find('.aviso').exists()).toBe(true))
    expect(wrapper.find('.aviso').text()).toBe('Serviço indisponível')
    expect(wrapper.text()).not.toContain('Dia livre.')
    expect(rotulo(wrapper)).toBe('Hoje, 29/09')
  })
})

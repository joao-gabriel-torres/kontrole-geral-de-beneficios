import type { ResumoAcionamento } from '@kgb/api-client'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'

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
})

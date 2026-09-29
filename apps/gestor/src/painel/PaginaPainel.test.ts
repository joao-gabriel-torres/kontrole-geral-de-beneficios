import type { ResumoAcionamento } from '@kgb/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type RespostaFalsa } from '../../test/api-falsa'
import { resumo } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { novoAcionamento } from '../acionamentos/novo/estado'
import { api } from '../api'
import { sair } from '../sessao'
import { periodoPainel } from './estado'
import { painelDoSeed } from './fixtures-painel'
import PaginaPainel from './PaginaPainel.vue'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../sessao', () => ({ sessao: { usuario: { nome: 'Renata Silva' } }, sair: vi.fn() }))

const larguraOriginal = window.innerWidth
function telaDe(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura })
}

const FILA: ResumoAcionamento[] = [
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
    prestador: { id: 'p2', nome: 'Ana Ribeiro', cor: '#FC7608' },
    ultimoEnvioEm: '2026-09-28T19:30:00.000Z',
  }),
]

describe('PaginaPainel', () => {
  let painel: () => RespostaFalsa | Promise<RespostaFalsa>
  let fila: ResumoAcionamento[]
  let simulada: ReturnType<typeof simularApi>
  beforeEach(() => {
    periodoPainel.value = 7
    painel = () => ({ data: painelDoSeed() })
    fila = FILA
    simulada = simularApi(api, {
      'GET /api/painel': (o: { params?: { query?: Record<string, unknown> } }) =>
        o.params?.query?.periodo === '30'
          ? { data: painelDoSeed({ periodo: 30, emAberto: 99 }) }
          : painel(),
      'GET /api/acionamentos': () => ({ data: fila }),
    })
  })
  afterEach(() => {
    telaDe(larguraOriginal)
    vi.useRealTimers()
  })

  it('"Novo acionamento" abre o modal', async () => {
    novoAcionamento.fechar()
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('h1').text()).toBe('Seu painel')
    await tela.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
    novoAcionamento.fechar()
  })

  it('consulta o painel dos últimos 7 dias e a fila de aprovação', async () => {
    await montar(PaginaPainel, { rota: '/painel' })
    expect(simulada.chamadas('GET', '/api/painel')[0]!.params!.query).toEqual({ periodo: '7' })
    expect(simulada.chamadas('GET', '/api/acionamentos')[0]!.params!.query).toMatchObject({
      status: 'aguardando',
    })
  })

  it('"30 dias" troca o período e fica marcado', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    const botao = () => tela.findAll('.seletor button').find((b) => b.text() === '30 dias')!
    expect(botao().attributes('aria-pressed')).toBe('false')
    await botao().trigger('click')
    await aguardar()
    expect(simulada.chamadas('GET', '/api/painel').at(-1)!.params!.query).toEqual({
      periodo: '30',
    })
    expect(botao().attributes('aria-pressed')).toBe('true')
    expect(periodoPainel.value).toBe(30)
    expect(tela.find('.kpi .valor').text()).toBe('99')
  })

  it('mostra os 5 KPIs com os textos do protótipo', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.findAll('.kpi').map((k) => k.text())).toEqual([
      'Acionamentos em aberto104 para hoje',
      'Aguardando aprovação3Na sua fila',
      'Taxa de aprovação73%8 de 11 análises',
      'Tempo médio de conclusão1h46Do início ao envio',
      'Demandas inviáveis16% do período',
    ])
  })

  it('"Acionamentos em aberto" leva à lista e "Aguardando aprovação" às Aprovações', async () => {
    const { tela, router } = await montar(PaginaPainel, { rota: '/painel' })
    const kpis = tela.findAll('.kpi')
    expect(kpis.map((k) => k.element.tagName)).toEqual(['A', 'A', 'DIV', 'DIV', 'DIV'])
    await kpis[0]!.trigger('click')
    await aguardar()
    expect(router.currentRoute.value.name).toBe('acionamentos')
    await router.push('/painel')
    await tela.findAll('.kpi')[1]!.trigger('click')
    await aguardar()
    expect(router.currentRoute.value.name).toBe('aprovacoes')
  })

  it('volume: uma coluna por dia, com o número e o dia da semana', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    const colunas = tela.findAll('.coluna')
    expect(colunas.map((c) => c.find('.numero').text())).toEqual([
      '2',
      '2',
      '1',
      '2',
      '2',
      '3',
      '4',
    ])
    expect(colunas.map((c) => c.find('.rotulo').text())).toEqual([
      'Qua',
      'Qui',
      'Sex',
      'Sáb',
      'Dom',
      'Seg',
      'Ter',
    ])
    expect(colunas[6]!.find('.barra').attributes('style')).toContain('height: 100%')
  })

  it('reprovações por tipo com a taxa e o total', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.findAll('.reprovacao').map((r) => r.find('.texto').text())).toEqual([
      'Reparo em gesso67% das demandas2',
      'Revisão elétrica33% das demandas1',
    ])
  })

  it('sem reprovações, o cartão fica só com o título', async () => {
    painel = () => ({ data: painelDoSeed({ reprovacoesPorTipo: [] }) })
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.reprovacoes').text()).toBe('Reprovações por tipo')
  })

  it('fila: o total no selo e os itens do envio mais antigo para o mais novo', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.fila .selo').text()).toBe('3')
    const itens = tela.findAll('.fila .item')
    expect(itens.map((i) => i.find('.linha').text())).toEqual([
      'AC-1059 · Enviado 28/09 · 10:30',
      'AC-1060 · Enviado 28/09 · 16:30',
      'AC-1062 · Enviado 29/09 · 08:45',
    ])
    expect(itens[1]!.text()).toContain('Pintura da fachada lateral')
    expect(itens[1]!.text()).toContain('AR')
    expect(itens[1]!.text()).toContain('Aguardando aprovação')
  })

  it('um item da fila abre o Detalhe pelo Painel', async () => {
    const { tela, router } = await montar(PaginaPainel, { rota: '/painel' })
    await tela.findAll('.fila .item')[1]!.trigger('click')
    await aguardar()
    expect(router.currentRoute.value.name).toBe('painel-acionamento')
    expect(router.currentRoute.value.params.id).toBe('a1060')
  })

  it('fila vazia: selo 0 e "Nada para conferir agora."', async () => {
    fila = []
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.fila .selo').text()).toBe('0')
    expect(tela.find('.fila .vazia').text()).toBe('Nada para conferir agora.')
  })

  it('ranking com posição, nome, concluídos, aprovação e tempo', async () => {
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    const linhas = tela.findAll('.ranking .posto')
    expect(linhas.map((l) => l.findAll('span').map((s) => s.text()))).toEqual([
      ['1º', 'Carlos Mendes', '3', '80%', '1h09'],
      ['2º', 'Ana Ribeiro', '2', '100%', '3h20'],
      ['3º', 'João Pires', '1', '50%', '1h23'],
      ['4º', 'Marina Costa', '1', '50%', '2h10'],
      ['5º', 'Luciana Prado', '0', '—', '—'],
    ])
    expect(linhas[0]!.find('.posicao').classes()).toContain('destaque')
    expect(linhas[1]!.find('.posicao').classes()).not.toContain('destaque')
  })

  it('enquanto carrega, não mostra números (nem zeros)', async () => {
    painel = () => new Promise(() => {})
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('h1').text()).toBe('Seu painel')
    expect(tela.find('.kpi').exists()).toBe(false)
    expect(tela.find('.erro').exists()).toBe(false)
  })

  it('erro da API: a mensagem num cartão, sem os blocos', async () => {
    painel = () => erroApi(500, 'interno', 'Erro interno')
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.erro').text()).toBe('Erro interno')
    expect(tela.find('.kpi').exists()).toBe(false)
  })

  it('a cada 30 s, busca o painel e a fila de novo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    await montar(PaginaPainel, { rota: '/painel' })
    const antes = simulada.chamadas('GET', '/api/painel').length
    const filaAntes = simulada.chamadas('GET', '/api/acionamentos').length
    vi.advanceTimersByTime(30_000)
    await aguardar()
    expect(simulada.chamadas('GET', '/api/painel').length).toBe(antes + 1)
    expect(simulada.chamadas('GET', '/api/acionamentos').length).toBe(filaAntes + 1)
  })

  it('uma atualização que falha mantém os números que já estavam na tela', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    painel = () => erroApi(500, 'interno', 'Erro interno')
    vi.advanceTimersByTime(30_000)
    await aguardar()
    expect(simulada.chamadas('GET', '/api/painel')).toHaveLength(2)
    expect(tela.find('.erro').exists()).toBe(false)
    expect(tela.find('.kpi .valor').text()).toBe('10')
  })

  it('no celular, o avatar abre o menu com "Sair", que volta ao login', async () => {
    telaDe(375)
    const { tela, router } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.conta').text()).toBe('RS')
    await tela.find('.conta [aria-haspopup="menu"]').trigger('click')
    await tela.find('[role="menuitem"]').trigger('click')
    await aguardar()
    expect(sair).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('no celular, as ações descem para a linha de baixo e deixam o canto do avatar livre', async () => {
    // Em 430px, sem a reserva, o "30 dias" sobe para a 1ª linha, embaixo do avatar.
    telaDe(430)
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.topo').classes()).toContain('compacto')
  })

  it('no computador, a conta fica só na barra lateral', async () => {
    telaDe(1440)
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.conta').exists()).toBe(false)
    expect(tela.find('.topo').classes()).not.toContain('compacto')
  })
})

import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'
import { avisar } from '../avisos'
import LayoutPrestador from './LayoutPrestador.vue'

const vazio = { template: '<div />' }
const rotas = [
  {
    path: '/',
    component: LayoutPrestador,
    children: [
      { path: 'inicio', name: 'inicio', component: vazio },
      { path: 'agenda', name: 'agenda', component: vazio },
      { path: 'demandas', name: 'demandas', component: vazio },
      { path: 'demandas/:id', name: 'detalhe', component: vazio, meta: { semAbas: true } },
    ],
  },
]

describe('LayoutPrestador', () => {
  afterEach(() => vi.useRealTimers())

  it('mostra a barra de abas nas telas principais', async () => {
    const { wrapper } = await montar(
      { template: '<RouterView />' },
      { rotas, rotaInicial: '/inicio' },
    )
    expect(wrapper.find('nav[aria-label="Navegação"]').exists()).toBe(true)
  })

  it('esconde a barra de abas no detalhe', async () => {
    const { wrapper } = await montar(
      { template: '<RouterView />' },
      { rotas, rotaInicial: '/demandas/a1' },
    )
    expect(wrapper.find('nav[aria-label="Navegação"]').exists()).toBe(false)
  })

  it('mostra os avisos do app e os esconde depois de 2,6 s', async () => {
    vi.useFakeTimers()
    const { wrapper } = await montar(
      { template: '<RouterView />' },
      { rotas, rotaInicial: '/inicio' },
    )
    avisar('Atendimento iniciado')
    await flushPromises()
    expect(wrapper.find('[role="status"]').text()).toBe('Atendimento iniciado')
    vi.advanceTimersByTime(2600)
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('cada acionamento aberto monta a própria página de detalhe', async () => {
    let montagens = 0
    const detalhe = { setup: () => void montagens++, template: '<div />' }
    const comDetalhe = [
      {
        path: '/',
        component: LayoutPrestador,
        children: [
          { path: 'demandas', name: 'demandas', component: vazio },
          { path: 'demandas/:id', name: 'detalhe', component: detalhe, meta: { semAbas: true } },
        ],
      },
    ]
    const { router } = await montar(
      { template: '<RouterView />' },
      { rotas: comDetalhe, rotaInicial: '/demandas/a1' },
    )
    await router.push('/demandas/a2')
    await flushPromises()
    expect(montagens).toBe(2)
  })

  it('abre cada tela no topo, mas trocar o filtro (query) não mexe na rolagem', async () => {
    const { wrapper, router } = await montar(
      { template: '<RouterView />' },
      { rotas, rotaInicial: '/demandas' },
    )
    const conteudo = wrapper.find('.conteudo').element as HTMLElement
    conteudo.scrollTop = 300
    await router.push('/demandas?filtro=corrigir')
    await flushPromises()
    expect(conteudo.scrollTop).toBe(300)
    await router.push('/demandas/a1')
    await flushPromises()
    expect(conteudo.scrollTop).toBe(0)
  })
})

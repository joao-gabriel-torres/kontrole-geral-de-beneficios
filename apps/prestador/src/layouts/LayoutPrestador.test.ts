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
})

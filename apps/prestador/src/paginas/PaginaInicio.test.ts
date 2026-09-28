import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const { sair } = vi.hoisted(() => ({ sair: vi.fn(async () => {}) }))
vi.mock('../sessao', () => ({
  sessao: { usuario: { nome: 'Carlos Mendes' }, carregada: true, indisponivel: false },
  sair,
}))
const { default: PaginaInicio } = await import('./PaginaInicio.vue')

describe('PaginaInicio', () => {
  it('cumprimenta pelo primeiro nome', async () => {
    const pagina = mount(PaginaInicio, { global: { plugins: [criarRouter()] } })
    expect(pagina.find('h1').text()).toMatch(/^(Bom dia|Boa tarde|Boa noite), Carlos$/)
  })

  it('o avatar abre o menu e "Sair" encerra a sessão e volta ao login', async () => {
    const router = criarRouter()
    await router.push('/inicio')
    const pagina = mount(PaginaInicio, { global: { plugins: [router] } })
    await pagina.find('.gatilho').trigger('click')
    await pagina.find('[role="menuitem"]').trigger('click')
    await flushPromises()
    expect(sair).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })
})

function criarRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/inicio', name: 'inicio', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

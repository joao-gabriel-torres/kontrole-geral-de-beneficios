import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ITENS_NAVEGACAO } from '../navegacao'
import NavLateral from './NavLateral.vue'

async function montar(aprovacoes: number) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ITENS_NAVEGACAO.map((i) => ({
      path: `/${i.rota}`,
      name: i.rota,
      component: { template: '<div />' },
    })),
  })
  await router.push('/aprovacoes')
  return mount(NavLateral, {
    props: { itens: ITENS_NAVEGACAO, aprovacoes, usuario: 'Renata Silva' },
    global: { plugins: [router] },
  })
}

describe('NavLateral', () => {
  it('lista os 5 itens do protótipo, na ordem', async () => {
    const nav = await montar(0)
    expect(nav.findAll('.rotulo').map((r) => r.text())).toEqual([
      'Painel',
      'Acionamentos',
      'Aprovações',
      'Prestadores',
      'Checklists',
    ])
    expect(nav.find('.titulo').text()).toBe('Gestão de demandas')
  })
  it('destaca a rota atual', async () => {
    const nav = await montar(0)
    expect(nav.find('.ativo .rotulo').text()).toBe('Aprovações')
  })
  it('mostra o badge de aprovações só quando há fila', async () => {
    expect((await montar(3)).find('.badge').text()).toBe('3')
    expect((await montar(0)).find('.badge').exists()).toBe(false)
  })
  it('mostra o cartão do usuário', async () => {
    const nav = await montar(0)
    expect(nav.find('.usuario').text()).toContain('RS')
    expect(nav.find('.usuario').text()).toContain('Renata Silva')
    expect(nav.find('.usuario').text()).toContain('Gestora')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ITENS_NAVEGACAO } from '../navegacao'
import NavInferior from './NavInferior.vue'

describe('NavInferior', () => {
  it('tem os 5 itens, o ativo marcado e o badge de aprovações', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ITENS_NAVEGACAO.map((i) => ({
        path: `/${i.rota}`,
        name: i.rota,
        component: { template: '<div />' },
      })),
    })
    await router.push('/painel')
    const nav = mount(NavInferior, {
      props: { itens: ITENS_NAVEGACAO, aprovacoes: 2 },
      global: { plugins: [router] },
    })
    expect(nav.findAll('.item')).toHaveLength(5)
    expect(nav.find('.ativo .rotulo').text()).toBe('Painel')
    expect(nav.find('.badge').text()).toBe('2')
  })
})

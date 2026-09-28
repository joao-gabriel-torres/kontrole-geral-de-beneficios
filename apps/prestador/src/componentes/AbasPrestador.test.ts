import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ABAS } from '../abas'
import AbasPrestador from './AbasPrestador.vue'

describe('AbasPrestador', () => {
  it('tem Início, Agenda e Demandas com a ativa marcada', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ABAS.map((a) => ({
        path: `/${a.rota}`,
        name: a.rota,
        component: { template: '<div />' },
      })),
    })
    await router.push('/agenda')
    const abas = mount(AbasPrestador, { props: { itens: ABAS }, global: { plugins: [router] } })
    expect(abas.findAll('.rotulo').map((r) => r.text())).toEqual(['Início', 'Agenda', 'Demandas'])
    expect(abas.find('.ativa .rotulo').text()).toBe('Agenda')
  })
})

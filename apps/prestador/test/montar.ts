import { opcoesVuetify } from '@kgb/ui'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { createVuetify } from 'vuetify'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

interface OpcoesMontar {
  props?: Record<string, unknown>
  rotas?: RouteRecordRaw[]
  rotaInicial?: string
}

const vazio = { template: '<div />' }

/** Rotas nomeadas do app, com páginas vazias: bastam para testar a navegação de um componente. */
export const ROTAS_VAZIAS: RouteRecordRaw[] = [
  { path: '/inicio', name: 'inicio', component: vazio },
  { path: '/agenda', name: 'agenda', component: vazio },
  { path: '/demandas', name: 'demandas', component: vazio },
  { path: '/demandas/:id', name: 'detalhe', component: vazio },
  { path: '/login', name: 'login', component: vazio },
]

/** Monta um componente com Vuetify, router de memória e vue-query (sem novas tentativas). */
export async function montar(componente: Component, opcoes: OpcoesMontar = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: opcoes.rotas ?? ROTAS_VAZIAS,
  })
  await router.push(opcoes.rotaInicial ?? '/inicio')
  await router.isReady()
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = mount(componente, {
    props: opcoes.props,
    attachTo: document.body,
    global: {
      plugins: [
        createVuetify(opcoesVuetify({ fundo: '#FFFFFF' })),
        router,
        [VueQueryPlugin, { queryClient: cliente }],
      ],
    },
  })
  await flushPromises()
  return { wrapper, router, cliente }
}

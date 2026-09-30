import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, type Component } from 'vue'
import { createVuetify } from 'vuetify'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'

const Vazio = defineComponent({ render: () => null })

/** As rotas nomeadas do gestor, com componentes vazios (para RouterLink e navegação). */
export function criarRouterDeTeste(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Vazio },
      { path: '/painel', name: 'painel', component: Vazio },
      { path: '/painel/:id', name: 'painel-acionamento', component: Vazio },
      { path: '/acionamentos', name: 'acionamentos', component: Vazio },
      { path: '/acionamentos/:id', name: 'acionamento', component: Vazio },
      { path: '/aprovacoes', name: 'aprovacoes', component: Vazio },
      { path: '/aprovacoes/:id', name: 'aprovacao', component: Vazio },
      { path: '/prestadores', name: 'prestadores', component: Vazio },
      { path: '/checklists', name: 'checklists', component: Vazio },
    ],
  })
}

export function criarClienteDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

/** Deixa as promessas e os avisos do vue-query (agendados com setTimeout) terminarem. */
export async function aguardar(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await flushPromises()
    await new Promise((pronto) => setTimeout(pronto, 0))
  }
}

export async function montar(
  componente: Component,
  opcoes: { props?: Record<string, unknown>; rota?: string; anexar?: boolean } = {},
) {
  const router = criarRouterDeTeste()
  await router.push(opcoes.rota ?? '/acionamentos')
  const consultas = criarClienteDeTeste()
  const tela = mount(componente, {
    props: opcoes.props,
    attachTo: opcoes.anexar ? document.body : undefined,
    global: { plugins: [createVuetify(), router, [VueQueryPlugin, { queryClient: consultas }]] },
  })
  await aguardar()
  return { tela, router, consultas }
}

export { RouterView }

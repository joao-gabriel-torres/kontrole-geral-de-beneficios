import type { Usuario } from '@kgb/api-client'
import {
  createRouter,
  createWebHistory,
  type RouteLocationRaw,
  type RouteMeta,
  type Router,
  type RouteRecordRaw,
} from 'vue-router'
import { carregarSessao, sair, sessao } from './sessao'

export const rotas: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./paginas/PaginaLogin.vue'),
    meta: { publica: true },
  },
  {
    path: '/',
    component: () => import('./layouts/LayoutPrestador.vue'),
    children: [
      { path: '', redirect: { name: 'inicio' } },
      { path: 'inicio', name: 'inicio', component: () => import('./inicio/PaginaInicio.vue') },
      { path: 'agenda', name: 'agenda', component: () => import('./paginas/PaginaAgenda.vue') },
      {
        path: 'demandas',
        name: 'demandas',
        component: () => import('./demandas/PaginaDemandas.vue'),
      },
      {
        path: 'demandas/:id',
        name: 'detalhe',
        component: () => import('./execucao/PaginaDetalhe.vue'),
        meta: { semAbas: true },
      },
    ],
  },
  { path: '/:caminho(.*)*', redirect: { name: 'inicio' } },
]

export type Decisao =
  { tipo: 'seguir' } | { tipo: 'redirecionar'; para: RouteLocationRaw } | { tipo: 'papel-errado' }

export function decidirAcesso(
  usuario: Usuario | null,
  destino: { fullPath: string; meta: RouteMeta },
  apiIndisponivel = false,
): Decisao {
  const publica = destino.meta.publica === true
  if (!usuario) {
    if (publica) return { tipo: 'seguir' }
    const query: Record<string, string> =
      destino.fullPath === '/' ? {} : { voltar: destino.fullPath }
    if (apiIndisponivel) query.motivo = 'conexao'
    return { tipo: 'redirecionar', para: { name: 'login', query } }
  }
  if (usuario.papel !== 'prestador') return { tipo: 'papel-errado' }
  if (publica) return { tipo: 'redirecionar', para: { name: 'inicio' } }
  return { tipo: 'seguir' }
}

/** Só aceita caminhos internos em ?voltar=, para não virar redirecionamento aberto. */
export function destinoSeguro(voltar: unknown): RouteLocationRaw {
  return typeof voltar === 'string' && voltar.startsWith('/') && !voltar.startsWith('//')
    ? voltar
    : { name: 'inicio' }
}

export function instalarGuarda(router: Router): void {
  router.beforeEach(async (destino) => {
    if (!sessao.carregada) await carregarSessao()
    const decisao = decidirAcesso(sessao.usuario, destino, sessao.indisponivel)
    if (decisao.tipo === 'seguir') return true
    if (decisao.tipo === 'redirecionar') return decisao.para
    await sair()
    return { name: 'login', query: { motivo: 'papel' } }
  })
}

export const router = createRouter({ history: createWebHistory(), routes: rotas })
instalarGuarda(router)

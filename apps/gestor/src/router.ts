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
    component: () => import('./layouts/LayoutGestor.vue'),
    children: [
      { path: '', redirect: { name: 'painel' } },
      {
        path: 'painel',
        children: [
          { path: '', name: 'painel', component: () => import('./painel/PaginaPainel.vue') },
          {
            // Detalhe aberto pela Fila de aprovação do Painel: o item "Painel" segue ativo.
            path: ':id',
            name: 'painel-acionamento',
            component: () => import('./acionamentos/detalhe/PaginaDetalhe.vue'),
            props: (r) => ({ id: String(r.params.id), origem: 'painel' }),
          },
        ],
      },
      {
        path: 'acionamentos',
        children: [
          {
            path: '',
            name: 'acionamentos',
            component: () => import('./acionamentos/PaginaAcionamentos.vue'),
          },
          {
            path: ':id',
            name: 'acionamento',
            component: () => import('./acionamentos/detalhe/PaginaDetalhe.vue'),
            props: (r) => ({ id: String(r.params.id), origem: 'acionamentos' }),
          },
        ],
      },
      {
        path: 'aprovacoes',
        children: [
          {
            path: '',
            name: 'aprovacoes',
            component: () => import('./aprovacoes/PaginaAprovacoes.vue'),
          },
          {
            path: ':id',
            name: 'aprovacao',
            component: () => import('./acionamentos/detalhe/PaginaDetalhe.vue'),
            props: (r) => ({ id: String(r.params.id), origem: 'aprovacoes' }),
          },
        ],
      },
      {
        path: 'prestadores',
        name: 'prestadores',
        component: () => import('./prestadores/PaginaPrestadores.vue'),
      },
      {
        path: 'checklists',
        name: 'checklists',
        component: () => import('./checklists/PaginaChecklists.vue'),
      },
    ],
  },
  { path: '/:caminho(.*)*', redirect: { name: 'painel' } },
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
  if (usuario.papel !== 'gestor') return { tipo: 'papel-errado' }
  if (publica) return { tipo: 'redirecionar', para: { name: 'painel' } }
  return { tipo: 'seguir' }
}

/** Só aceita caminhos internos em ?voltar=, para não virar redirecionamento aberto. */
export function destinoSeguro(voltar: unknown): RouteLocationRaw {
  return typeof voltar === 'string' && voltar.startsWith('/') && !voltar.startsWith('//')
    ? voltar
    : { name: 'painel' }
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

import createClient, { type Middleware } from 'openapi-fetch'
import type { components, paths } from './schema'

export type { components, paths }
export type Usuario = components['schemas']['Usuario']
export type ContagemAcionamentos = components['schemas']['ContagemAcionamentos']
export type CorpoErro = components['schemas']['Erro']

export interface OpcoesClienteApi {
  baseUrl?: string
  obterToken?: () => string | null
  fetch?: typeof globalThis.fetch
}

export function middlewareBearer(obterToken: () => string | null): Middleware {
  return {
    onRequest({ request }) {
      const token = obterToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  }
}

export function criarClienteApi({ baseUrl = '', obterToken, fetch }: OpcoesClienteApi = {}) {
  const cliente = createClient<paths>({
    baseUrl,
    credentials: 'include',
    ...(fetch ? { fetch } : {}),
  })
  if (obterToken) cliente.use(middlewareBearer(obterToken))
  return cliente
}

export type ClienteApi = ReturnType<typeof criarClienteApi>

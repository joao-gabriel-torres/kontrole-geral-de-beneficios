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

/**
 * Com `obterToken` (app do prestador) a sessão vai só no Bearer: sem cookies, para não misturar a
 * sessão com a do gestor quando os dois apps rodam no mesmo navegador.
 */
export function criarClienteApi({ baseUrl = '', obterToken, fetch }: OpcoesClienteApi = {}) {
  const cliente = createClient<paths>({
    baseUrl,
    credentials: obterToken ? 'omit' : 'include',
    ...(fetch ? { fetch } : {}),
  })
  if (obterToken) cliente.use(middlewareBearer(obterToken))
  return cliente
}

export type ClienteApi = ReturnType<typeof criarClienteApi>

/** Tempo máximo de espera por uma resposta da API antes de tratar como indisponível. */
export const TEMPO_LIMITE_PADRAO = 8000

export class ErroTempoEsgotado extends Error {
  constructor() {
    super('A API não respondeu a tempo')
    this.name = 'ErroTempoEsgotado'
  }
}

/** Executa a requisição com um AbortSignal que é disparado se a API não responder a tempo. */
export function comTempoLimite<T>(
  executar: (sinal: AbortSignal) => Promise<T>,
  ms = TEMPO_LIMITE_PADRAO,
): Promise<T> {
  const controle = new AbortController()
  return new Promise<T>((resolver, rejeitar) => {
    const temporizador = setTimeout(() => {
      controle.abort()
      rejeitar(new ErroTempoEsgotado())
    }, ms)
    executar(controle.signal).then(
      (valor) => {
        clearTimeout(temporizador)
        resolver(valor)
      },
      (erro: unknown) => {
        clearTimeout(temporizador)
        rejeitar(erro)
      },
    )
  })
}

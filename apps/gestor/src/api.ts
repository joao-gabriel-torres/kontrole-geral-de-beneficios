import { criarClienteApi } from '@kgb/api-client'
import { criarClienteAuth } from '@kgb/api-client/auth'

/** Origem da API. Vazio em dev (proxy do Vite): usa a própria origem do app. */
export const BASE_API = import.meta.env.VITE_API_URL || window.location.origin

export const api = criarClienteApi({ baseUrl: BASE_API })
export const auth = criarClienteAuth({ baseURL: BASE_API })

import { criarClienteApi } from '@kgb/api-client'
import { criarClienteAuth } from '@kgb/api-client/auth'
import { obterToken, salvarToken } from './token'

/** Origem da API: no nativo vem do build (VITE_API_URL); no navegador, o proxy do Vite. */
export const baseApi = import.meta.env.VITE_API_URL || window.location.origin

export const api = criarClienteApi({ baseUrl: baseApi, obterToken })
export const auth = criarClienteAuth({
  baseURL: baseApi,
  obterToken,
  salvarToken: (token) => void salvarToken(token),
})

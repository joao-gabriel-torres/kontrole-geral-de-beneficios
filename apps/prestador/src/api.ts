import { criarClienteApi } from '@kgb/api-client'
import { criarClienteAuth } from '@kgb/api-client/auth'
import { obterToken, salvarToken } from './token'

const base = import.meta.env.VITE_API_URL || window.location.origin

export const api = criarClienteApi({ baseUrl: base, obterToken })
export const auth = criarClienteAuth({
  baseURL: base,
  obterToken,
  salvarToken: (token) => void salvarToken(token),
})

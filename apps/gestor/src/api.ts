import { criarClienteApi } from '@kgb/api-client'
import { criarClienteAuth } from '@kgb/api-client/auth'

const base = import.meta.env.VITE_API_URL || window.location.origin

export const api = criarClienteApi({ baseUrl: base })
export const auth = criarClienteAuth({ baseURL: base })

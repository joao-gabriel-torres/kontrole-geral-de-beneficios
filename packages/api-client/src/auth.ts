import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

export interface OpcoesClienteAuth {
  baseURL: string
  /** App do prestador: token guardado no aparelho, enviado como Bearer. */
  obterToken?: () => string | null
  salvarToken?: (token: string) => void
}

export function criarClienteAuth({ baseURL, obterToken, salvarToken }: OpcoesClienteAuth) {
  return createAuthClient({
    baseURL,
    basePath: '/api/auth',
    plugins: [
      inferAdditionalFields({
        user: {
          role: { type: 'string', required: false },
          prestadorId: { type: 'string', required: false },
        },
      }),
    ],
    fetchOptions: {
      credentials: 'include',
      ...(obterToken ? { auth: { type: 'Bearer' as const, token: () => obterToken() ?? '' } } : {}),
      onSuccess: (contexto) => {
        const token = contexto.response.headers.get('set-auth-token')
        if (token && salvarToken) salvarToken(token)
      },
    },
  })
}

export type ClienteAuth = ReturnType<typeof criarClienteAuth>

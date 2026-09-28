import { createMiddleware } from 'hono/factory'
import { auth } from '../auth'
import type { Ambiente, UsuarioSessao } from '../contexto'

interface UsuarioAuth {
  id: string
  name: string
  email: string
  role?: string | null
  prestadorId?: string | null
}

function paraUsuarioSessao(u: UsuarioAuth): UsuarioSessao {
  return {
    id: u.id,
    nome: u.name,
    email: u.email,
    papel: u.role === 'gestor' ? 'gestor' : 'prestador',
    prestadorId: u.prestadorId ?? null,
  }
}

/** Resolve a sessão (cookie ou Bearer) e guarda o usuário no contexto. */
export const sessao = createMiddleware<Ambiente>(async (c, next) => {
  const resultado = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set('usuario', resultado ? paraUsuarioSessao(resultado.user) : null)
  await next()
})

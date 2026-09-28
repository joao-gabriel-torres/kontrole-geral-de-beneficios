import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Ambiente, Papel, UsuarioSessao } from '../contexto'
import { corpoErro } from '../erros'

const SEM_LOGIN = corpoErro('nao_autenticado', 'Faça login para continuar')

export const exigeLogin = createMiddleware<Ambiente>(async (c, next) => {
  if (!c.get('usuario')) return c.json(SEM_LOGIN, 401)
  await next()
})

export function exigePapel(papel: Papel) {
  return createMiddleware<Ambiente>(async (c, next) => {
    const usuario = c.get('usuario')
    if (!usuario) return c.json(SEM_LOGIN, 401)
    if (usuario.papel !== papel) {
      return c.json(corpoErro('sem_permissao', 'Seu papel não tem acesso a este recurso'), 403)
    }
    await next()
  })
}

/** Usuário da sessão em rotas protegidas por exigeLogin/exigePapel. */
export function usuarioLogado(c: Context<Ambiente>): UsuarioSessao {
  const usuario = c.get('usuario')
  if (!usuario) throw new HTTPException(401, { message: 'Faça login para continuar' })
  return usuario
}

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError } from 'better-auth/api'
import { bearer } from 'better-auth/plugins'
import { createMiddleware } from 'hono/factory'
import { prisma } from './db'
import { env } from './env'
import { prestadorBloqueado } from './prestador-bloqueado'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // Criar a senha pelo convite também serve de redefinição: as sessões abertas com a senha antiga caem.
  emailAndPassword: { enabled: true, disableSignUp: true, revokeSessionsOnPasswordReset: true },
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'prestador', input: false },
      prestadorId: { type: 'string', required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const usuario = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true, prestadorId: true },
          })
          if (usuario?.role !== 'gestor' && (await prestadorBloqueado(usuario?.prestadorId))) {
            throw new APIError('FORBIDDEN', {
              message: 'Seu cadastro de prestador foi encerrado',
              code: 'PRESTADOR_EXCLUIDO',
            })
          }
        },
      },
    },
  },
  plugins: [bearer()],
  trustedOrigins: env.CORS_ORIGINS,
})

/** Caminhos que o prestador excluído ainda usa: entrar com outra conta e sair. */
const LIVRES_DA_GUARDA = /^\/api\/auth\/(sign-in\/|sign-out$)/

/**
 * A sessão de um prestador excluído não vale nem nas rotas do Better Auth: sem isso, ele continua
 * lendo a sessão e o token, listando sessões e trocando o perfil. Fica no Hono porque o
 * `hooks.before` do Better Auth roda antes do plugin `bearer` (não veria o token do app) e também
 * roda no `auth.api.getSession` do middleware `sessao` (o erro viraria 500 em /api/me).
 * O inativo passa: ver `prestadorBloqueado`.
 */
export const guardaAuth = createMiddleware(async (c, next) => {
  if (LIVRES_DA_GUARDA.test(c.req.path)) return next()
  const sessao = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableRefresh: true },
  })
  const usuario = sessao?.user
  if (usuario && usuario.role !== 'gestor' && (await prestadorBloqueado(usuario.prestadorId))) {
    return c.json(
      { code: 'PRESTADOR_EXCLUIDO', message: 'Seu cadastro de prestador foi encerrado' },
      401,
    )
  }
  return next()
})

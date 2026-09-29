import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError } from 'better-auth/api'
import { bearer } from 'better-auth/plugins'
import { prisma } from './db'
import { env } from './env'
import { prestadorBloqueado } from './prestador-bloqueado'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, disableSignUp: true },
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

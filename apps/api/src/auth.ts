import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { bearer } from 'better-auth/plugins'
import { prisma } from './db'
import { env } from './env'

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
  plugins: [bearer()],
  trustedOrigins: env.CORS_ORIGINS,
})

import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

const Esquema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((texto) =>
      texto
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
    ),
  PORT: z.coerce.number().int().positive().default(3000),
})

export const env = Esquema.parse(process.env)

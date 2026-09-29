import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

/** Placeholder do .env.example: a API se recusa a subir com ele. */
const SEGREDO_DE_EXEMPLO = 'troque-por-um-segredo-com-32-caracteres-ou-mais'

export const EsquemaEnv = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine((segredo) => segredo !== SEGREDO_DE_EXEMPLO, {
      message: 'Troque o BETTER_AUTH_SECRET de exemplo (openssl rand -base64 32)',
    }),
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

export const env = EsquemaEnv.parse(process.env)

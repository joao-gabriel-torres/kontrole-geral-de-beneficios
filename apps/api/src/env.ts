import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url))

config({ path: resolve(RAIZ, '.env'), quiet: true })

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
  /** Pasta das fotos no dev; caminho relativo é resolvido a partir da raiz do repositório. */
  ARQUIVOS_DIR: z
    .string()
    .default('var/uploads')
    .transform((pasta) => resolve(RAIZ, pasta)),
})

export const env = EsquemaEnv.parse(process.env)

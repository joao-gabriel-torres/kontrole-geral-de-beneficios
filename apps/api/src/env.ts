import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

/** Raiz do repositório: base dos caminhos relativos do .env. */
export const RAIZ = fileURLToPath(new URL('../../../', import.meta.url))

config({ path: resolve(RAIZ, '.env'), quiet: true })

/** Placeholder do .env.example: a API se recusa a subir com ele. */
const SEGREDO_DE_EXEMPLO = 'troque-por-um-segredo-com-32-caracteres-ou-mais'

/** Variável vazia no .env (`SMTP_URL=""`) conta como ausente. */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((valor) => (valor === '' ? undefined : valor), esquema.optional())

export const EsquemaEnv = z
  .object({
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
    /** Servidor de e-mail. Sem ele (dev), os e-mails ficam em var/emails/ e o link aparece no log. */
    SMTP_URL: opcional(z.url()),
    EMAIL_REMETENTE: opcional(z.string()),
    /** Endereço do app do prestador usado no link do convite. */
    URL_APP_PRESTADOR: z.url().default('http://localhost:5174'),
  })
  .refine((e) => !e.SMTP_URL || e.EMAIL_REMETENTE, {
    message: 'Defina EMAIL_REMETENTE para enviar e-mails por SMTP',
    path: ['EMAIL_REMETENTE'],
  })

export const env = EsquemaEnv.parse(process.env)

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

/** A origem que o navegador mandaria para este endereço (sem caminho nem barra), ou null. */
function origemDe(endereco: string): string | null {
  if (!URL.canParse(endereco)) return null
  const url = new URL(endereco)
  // `localhost:5173` também é uma URL (esquema "localhost:"), mas sem host não é origem.
  return url.host ? `${url.protocol}//${url.host}` : null
}

/**
 * Uma origem de CORS_ORIGINS. O navegador manda a origem sem barra nem caminho, e o CORS e o
 * Better Auth comparam o texto exato: `https://gestor.dominio/` (copiada da barra de endereços)
 * barraria o gestor sem erro nenhum na subida.
 */
const Origem = z.string().refine((origem) => origemDe(origem) === origem, {
  error: ({ input }) => {
    const certa = typeof input === 'string' ? origemDe(input) : null
    return certa
      ? `"${String(input)}" não é uma origem: use "${certa}" (sem barra nem caminho no fim)`
      : `"${String(input)}" não é uma origem (ex.: https://gestor.seu-dominio.com.br)`
  },
})

/** Endereço do app do prestador no dev; em produção, `URL_APP_PRESTADOR` é obrigatória. */
export const URL_APP_PRESTADOR_DEV = 'http://localhost:5174'

export const EsquemaEnv = z
  .object({
    /** `production` no servidor: aí o convite exige SMTP e o endereço do app. */
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .refine((segredo) => segredo !== SEGREDO_DE_EXEMPLO, {
        message: 'Troque o BETTER_AUTH_SECRET de exemplo (openssl rand -base64 32)',
      }),
    BETTER_AUTH_URL: z.url(),
    /** Origens dos apps (gestor, prestador web e nativo), liberadas no CORS e no Better Auth. */
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((texto) =>
        texto
          .split(',')
          .map((origem) => origem.trim())
          .filter(Boolean),
      )
      .pipe(z.array(Origem)),
    PORT: z.coerce.number().int().positive().default(3000),
    /** Pasta das fotos no dev; caminho relativo é resolvido a partir da raiz do repositório. */
    ARQUIVOS_DIR: z
      .string()
      .default('var/uploads')
      .transform((pasta) => resolve(RAIZ, pasta)),
    /** Servidor de e-mail. Sem ele (dev), os e-mails ficam em var/emails/ e o link aparece no log. */
    SMTP_URL: opcional(
      z.url({
        protocol: /^smtps?$/,
        error:
          'SMTP_URL precisa ser smtp:// ou smtps://; senha ou chave com caracteres especiais (/, #, +…) entra codificada com encodeURIComponent',
      }),
    ),
    EMAIL_REMETENTE: opcional(z.string()),
    /** Endereço do app do prestador usado no link do convite (vazio no dev: localhost:5174). */
    URL_APP_PRESTADOR: opcional(z.url()),
  })
  .superRefine((e, ctx) => {
    if (e.SMTP_URL && !e.EMAIL_REMETENTE) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_REMETENTE'],
        message: 'Defina EMAIL_REMETENTE para enviar e-mails por SMTP',
      })
    }
    if (e.NODE_ENV !== 'production') return
    // Sem estas duas, o convite responderia 200 sem mandar nada, ou mandaria um link para localhost.
    if (!e.SMTP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'Em produção, defina SMTP_URL: sem ela nenhum convite chega ao prestador',
      })
    }
    if (!e.URL_APP_PRESTADOR) {
      ctx.addIssue({
        code: 'custom',
        path: ['URL_APP_PRESTADOR'],
        message: 'Em produção, defina URL_APP_PRESTADOR: é o endereço do link do convite',
      })
    }
  })
  .transform(({ URL_APP_PRESTADOR, ...resto }) => ({
    ...resto,
    URL_APP_PRESTADOR: URL_APP_PRESTADOR ?? URL_APP_PRESTADOR_DEV,
  }))

export type Env = z.infer<typeof EsquemaEnv>

/** Lê as variáveis; se algo estiver errado, a API não sobe e diz qual variável e por quê. */
export function lerEnv(fonte: Record<string, string | undefined>): Env {
  const lido = EsquemaEnv.safeParse(fonte)
  if (!lido.success) {
    throw new Error(`Configuração inválida no .env:\n${z.prettifyError(lido.error)}`)
  }
  return lido.data
}

export const env = lerEnv(process.env)

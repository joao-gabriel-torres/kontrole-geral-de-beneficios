import { createTransport } from 'nodemailer'
import type { Correio } from './tipos'

/** O pedaço do transporte do nodemailer que o correio usa (trocável nos testes). */
export interface TransporteSmtp {
  sendMail(opcoes: {
    from: string
    to: string
    subject: string
    text: string
    html: string
  }): Promise<unknown>
}

/**
 * Tempos do SMTP. Os fronts desistem da chamada em 8 s (`TEMPO_LIMITE_PADRAO` do api-client):
 * o envio falha antes disso para o gestor ver o 502 claro, e não um "tempo esgotado" genérico.
 * Os padrões do nodemailer (2 min de conexão, 30 s de saudação) seguravam a requisição.
 * - `conexaoMs`, `saudacaoMs` e `inatividadeMs` vão para o nodemailer e liberam o socket;
 * - `totalMs` limita o envio inteiro, porque as etapas somadas podem passar dos 8 s.
 */
export const LIMITES_SMTP = {
  conexaoMs: 4_000,
  saudacaoMs: 3_000,
  inatividadeMs: 5_000,
  totalMs: 6_000,
} as const

/** Transporte do nodemailer com os tempos acima (a URL é ex.: smtps://usuario:senha@host:465). */
export function criarTransporteSmtp(url: string, limites = LIMITES_SMTP): TransporteSmtp {
  return createTransport({
    url,
    connectionTimeout: limites.conexaoMs,
    greetingTimeout: limites.saudacaoMs,
    socketTimeout: limites.inatividadeMs,
  })
}

/** Rejeita se a promessa não terminar em `ms`. */
async function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  const esgotado = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(
      () => rejeitar(new Error(`O servidor de e-mail não respondeu em ${ms / 1000} s`)),
      ms,
    )
  })
  try {
    return await Promise.race([promessa, esgotado])
  } finally {
    clearTimeout(relogio)
  }
}

/** Produção: SMTP pelo nodemailer, com `SMTP_URL` (ex.: smtps://usuario:senha@host:465). */
export function criarCorreioSmtp(
  url: string,
  remetente: string,
  transporte: TransporteSmtp = criarTransporteSmtp(url),
  limiteMs: number = LIMITES_SMTP.totalMs,
): Correio {
  return {
    async enviar(mensagem) {
      await comLimite(
        transporte.sendMail({
          from: remetente,
          to: mensagem.para,
          subject: mensagem.assunto,
          text: mensagem.texto,
          html: mensagem.html,
        }),
        limiteMs,
      )
    },
  }
}

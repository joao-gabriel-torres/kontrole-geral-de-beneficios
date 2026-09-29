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

/** Produção: SMTP pelo nodemailer, com `SMTP_URL` (ex.: smtps://usuario:senha@host:465). */
export function criarCorreioSmtp(
  url: string,
  remetente: string,
  transporte: TransporteSmtp = createTransport(url),
): Correio {
  return {
    async enviar(mensagem) {
      await transporte.sendMail({
        from: remetente,
        to: mensagem.para,
        subject: mensagem.assunto,
        text: mensagem.texto,
        html: mensagem.html,
      })
    },
  }
}

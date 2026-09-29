import { resolve } from 'node:path'
import { env, RAIZ } from '../env'
import { criarCorreioDeArquivo } from './arquivo'
import { criarCorreioSmtp } from './smtp'
import type { Correio } from './tipos'

export type { Correio, MensagemEmail } from './tipos'
export { criarCorreioDeArquivo } from './arquivo'
export { criarCorreioEmMemoria, type CorreioEmMemoria } from './memoria'

/** Onde o correio de desenvolvimento grava os e-mails (fora do git, como var/uploads). */
export const PASTA_EMAILS = resolve(RAIZ, 'var/emails')

/** SMTP quando há `SMTP_URL`; senão, arquivo em `var/emails/` com o link no log. */
export function criarCorreio(
  config: { SMTP_URL?: string; EMAIL_REMETENTE?: string },
  pasta = PASTA_EMAILS,
): Correio {
  if (!config.SMTP_URL) return criarCorreioDeArquivo(pasta)
  if (!config.EMAIL_REMETENTE) {
    throw new Error('Defina EMAIL_REMETENTE para enviar e-mails por SMTP')
  }
  return criarCorreioSmtp(config.SMTP_URL, config.EMAIL_REMETENTE)
}

let atual: Correio | null = null

/** Correio da API, criado na primeira vez a partir do .env. */
export function correio(): Correio {
  atual ??= criarCorreio(env)
  return atual
}

/** Troca o correio da API (testes); `null` volta ao do .env. */
export function trocarCorreio(novo: Correio | null): void {
  atual = novo
}

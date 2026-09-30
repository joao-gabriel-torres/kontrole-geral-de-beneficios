import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ErroDominio } from './acionamento'

export const VALIDADE_CONVITE_DIAS = 7

/**
 * O convite usa a redefinição de senha do Better Auth: o identificador dele é `reset-password:`
 * seguido do token do link.
 */
export const PREFIXO_CONVITE = 'reset-password:'

/**
 * Prefixo do convite como fica na tabela `verification`: só o hash do identificador, para quem lê
 * o banco não conseguir usar o link. Tem de ser diferente de `PREFIXO_CONVITE`: depois de procurar
 * o hash, o Better Auth ainda procura o identificador em texto puro (registros antigos), e um hash
 * gravado com o mesmo prefixo viraria um token válido para quem o lesse.
 */
export const PREFIXO_CONVITE_GRAVADO = 'reset-password-sha256:'

/**
 * O que se grava para o identificador `reset-password:<token>` (o `storeIdentifier` de auth.ts
 * chama esta mesma função). O token tem 256 bits aleatórios: SHA-256 sem sal basta.
 */
export function identificadorGravado(identificador: string): string {
  const hash = createHash('sha256').update(identificador).digest('base64url')
  return `${PREFIXO_CONVITE_GRAVADO}${hash}`
}

export const ASSUNTO_CONVITE = 'Seu acesso ao app da Russo Assistência'

export const MENSAGENS_CONVITE = {
  semEmail: 'Cadastre um e-mail para enviar o convite',
  emailInvalido: 'O e-mail do cadastro não é válido',
  emailEmUso: 'Este e-mail já é usado por outra conta',
  envioFalhou: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
} as const

/**
 * Situação do acesso do prestador ao app:
 * - `ativo`: já tem senha;
 * - `convidado`: tem convite válido;
 * - `pendente`: tem e-mail, mas não tem convite válido nem senha;
 * - `sem_email`: não tem e-mail no cadastro (nem senha).
 */
export type AcessoPrestador = 'sem_email' | 'pendente' | 'convidado' | 'ativo'

/**
 * Login do usuário de um prestador excluído. O usuário fica (os eventos dos acionamentos apontam
 * para ele), mas o e-mail volta a ficar livre para um novo credenciamento. O domínio `.local` é
 * reservado: nenhum e-mail sai para esse endereço.
 */
export function emailDoExcluido(prestadorId: string): string {
  return `excluido+${prestadorId}@invalido.local`
}

/** O login é o e-mail em minúsculas e sem espaços, como o Better Auth procura. */
export function normalizarEmail(email: string | null | undefined): string | null {
  const limpo = email?.trim().toLowerCase() ?? ''
  return limpo === '' ? null : limpo
}

/** Mesmo critério do sign-in do Better Auth (`z.email()`), sobre o e-mail normalizado. */
export function emailValido(email: string): boolean {
  const normalizado = normalizarEmail(email)
  return !!normalizado && z.email().safeParse(normalizado).success
}

export function expiracaoDoConvite(agora: Date): Date {
  return new Date(agora.getTime() + VALIDADE_CONVITE_DIAS * 24 * 60 * 60 * 1000)
}

/**
 * Momento gravado no convite novo: agora, ou 1 ms depois do último convite do usuário quando o
 * relógio não andou. Os convites do mesmo usuário nascem em fila (trava do prestador), e a ordem
 * estrita decide quem sobra: o envio que dá certo apaga só os anteriores a ele.
 */
export function momentoDoConvite(anterior: Date | null, agora: Date): Date {
  return anterior && anterior >= agora ? new Date(anterior.getTime() + 1) : agora
}

export function linkDoConvite(urlApp: string, token: string): string {
  return `${urlApp.replace(/\/+$/, '')}/convite?token=${encodeURIComponent(token)}`
}

/**
 * Confere se o convite pode sair e devolve o e-mail normalizado, que vira o login.
 * O formato é o mesmo `z.email()` do sign-in do Better Auth: um login que ele recusa trancaria o
 * prestador para fora, e um texto com vírgula ou ponto e vírgula levaria o link a outro endereço.
 * `contaDoEmail` é a conta que já usa esse e-mail, se houver: só serve a do próprio prestador.
 */
export function verificarConvite(dados: {
  prestadorId: string
  email: string | null
  contaDoEmail: { prestadorId: string | null } | null
}): string {
  const email = normalizarEmail(dados.email)
  if (!email) throw new ErroDominio('prestador_sem_email', MENSAGENS_CONVITE.semEmail, 409)
  if (!emailValido(email)) {
    throw new ErroDominio('email_invalido', MENSAGENS_CONVITE.emailInvalido, 409)
  }
  if (dados.contaDoEmail && dados.contaDoEmail.prestadorId !== dados.prestadorId) {
    throw new ErroDominio('email_em_uso', MENSAGENS_CONVITE.emailEmUso, 409)
  }
  return email
}

/** Quem já tem senha está ativo mesmo sem e-mail no cadastro; o convite vencido volta a pendente. */
export function situacaoDoAcesso(dados: {
  email: string | null
  temSenha: boolean
  conviteValido: boolean
}): AcessoPrestador {
  if (dados.temSenha) return 'ativo'
  if (!normalizarEmail(dados.email)) return 'sem_email'
  return dados.conviteValido ? 'convidado' : 'pendente'
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const escapar = (texto: string) => texto.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)

/** E-mail do convite: texto puro e um HTML simples com o botão "Criar minha senha". */
export function emailDoConvite(dados: { nome: string; email: string; link: string }): {
  assunto: string
  texto: string
  html: string
} {
  const primeiroNome = dados.nome.trim().split(/\s+/)[0] ?? ''
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'
  const convite = 'Seu acesso ao app da Russo Assistência está pronto. Para entrar, crie sua senha.'
  const validade = `O link vale por ${VALIDADE_CONVITE_DIAS} dias.`
  const ignorar = 'Se você não esperava este convite, ignore este e-mail.'

  const texto = [
    saudacao,
    '',
    convite,
    '',
    `Criar minha senha: ${dados.link}`,
    '',
    `Seu login é o e-mail ${dados.email}.`,
    validade,
    '',
    ignorar,
  ].join('\n')

  const link = escapar(dados.link)
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(ASSUNTO_CONVITE)}</title>
</head>
<body style="margin:0;padding:24px 16px;background:#F9F9F9;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#363853">
<div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:24px;padding:32px 24px">
<p style="margin:0 0 24px;font-size:16px;font-weight:800;color:#0069BD">RUSSO <span style="font-weight:600">ASSISTÊNCIA</span></p>
<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#2C3143">${escapar(saudacao)}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.5">${escapar(convite)}</p>
<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#0069BD;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px">Criar minha senha</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.5">Seu login é o e-mail <strong>${escapar(dados.email)}</strong>.</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.5">${escapar(validade)}</p>
<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#50555C">Se o botão não abrir, copie este endereço no navegador:<br><a href="${link}" style="color:#0069BD;word-break:break-all">${link}</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#50555C">${escapar(ignorar)}</p>
</div>
</body>
</html>
`
  return { assunto: ASSUNTO_CONVITE, texto, html }
}

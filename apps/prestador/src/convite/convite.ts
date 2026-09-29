import { comTempoLimite } from '@kgb/api-client'
import { auth } from '../api'

/** Limites de senha do Better Auth (padrão: 8 a 128 caracteres). */
export const TAMANHO_MINIMO_SENHA = 8
export const TAMANHO_MAXIMO_SENHA = 128

export const MENSAGENS_CONVITE = {
  curta: 'Use pelo menos 8 caracteres',
  longa: 'Use no máximo 128 caracteres',
  diferentes: 'As senhas não conferem',
  expirado: 'Este convite expirou ou já foi usado. Peça um novo à Russo Assistência.',
  tentativas: 'Muitas tentativas. Aguarde alguns segundos e tente de novo.',
  indisponivel: 'Não foi possível criar a senha. Verifique sua conexão e tente de novo.',
} as const

/** Mensagem do primeiro problema das senhas digitadas, ou null se estão boas. */
export function validarSenhas(senha: string, confirmacao: string): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) return MENSAGENS_CONVITE.curta
  if (senha.length > TAMANHO_MAXIMO_SENHA) return MENSAGENS_CONVITE.longa
  if (senha !== confirmacao) return MENSAGENS_CONVITE.diferentes
  return null
}

export type ResultadoConvite =
  | { ok: true }
  | {
      ok: false
      mensagem: string
      /** O link não serve mais (usado, vencido ou inválido): tentar de novo não adianta. */
      conviteInvalido: boolean
    }

function falha(mensagem: string, conviteInvalido = false): ResultadoConvite {
  return { ok: false, mensagem, conviteInvalido }
}

/** Cria a senha com o token do convite (o `reset-password` do Better Auth consome o token). */
export async function criarSenha(token: string, senha: string): Promise<ResultadoConvite> {
  try {
    const { error } = await comTempoLimite((signal) =>
      auth.resetPassword({ newPassword: senha, token }, { signal }),
    )
    if (!error) return { ok: true }
    if (error.code === 'INVALID_TOKEN' || error.code === 'USER_NOT_FOUND') {
      return falha(MENSAGENS_CONVITE.expirado, true)
    }
    if (error.code === 'PASSWORD_TOO_SHORT') return falha(MENSAGENS_CONVITE.curta)
    if (error.code === 'PASSWORD_TOO_LONG') return falha(MENSAGENS_CONVITE.longa)
    if (error.status === 429) return falha(MENSAGENS_CONVITE.tentativas)
    return falha(MENSAGENS_CONVITE.indisponivel)
  } catch {
    return falha(MENSAGENS_CONVITE.indisponivel)
  }
}

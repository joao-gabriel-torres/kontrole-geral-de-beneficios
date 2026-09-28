import { comTempoLimite, type Usuario } from '@kgb/api-client'
import { reactive, readonly } from 'vue'
import { api, auth } from './api'
import { obterToken, salvarToken } from './token'

export const MENSAGENS = {
  credenciais: 'E-mail ou senha incorretos',
  tentativas: 'Muitas tentativas. Aguarde alguns segundos e tente de novo.',
  indisponivel: 'Não foi possível entrar. Verifique sua conexão e tente de novo.',
  papel: 'Esta conta é de gestor. Use o painel web.',
  inativo: 'Seu cadastro está inativo. Fale com a Russo Assistência para voltar a atender.',
} as const

const estado = reactive<{ usuario: Usuario | null; carregada: boolean; indisponivel: boolean }>({
  usuario: null,
  carregada: false,
  indisponivel: false,
})
export const sessao = readonly(estado)

/**
 * Busca o usuário do token guardado no aparelho. Token recusado (401) é apagado. Se a API não
 * responder (erro de rede, tempo esgotado ou 5xx), o token é mantido, `indisponivel` fica marcado e
 * `carregada` fica falso para tentar de novo na próxima navegação.
 */
export async function carregarSessao(): Promise<Usuario | null> {
  estado.usuario = null
  estado.indisponivel = false
  if (obterToken()) {
    try {
      const { data, response } = await comTempoLimite((signal) => api.GET('/api/me', { signal }))
      if (response.status === 401) await salvarToken(null)
      estado.indisponivel = response.status >= 500
      estado.usuario = estado.indisponivel ? null : (data ?? null)
    } catch {
      estado.indisponivel = true
    }
  }
  estado.carregada = !estado.indisponivel
  return estado.usuario
}

/** Mensagem do login para quem foi mandado de volta a ele (?motivo=). */
export function mensagemDoMotivo(motivo: unknown): string | null {
  if (motivo === 'papel') return MENSAGENS.papel
  if (motivo === 'conexao') return MENSAGENS.indisponivel
  return null
}

export type ResultadoLogin = { ok: true } | { ok: false; mensagem: string }

/** O 403 também vem de origem recusada pela API: só o código diz que o cadastro está inativo. */
function mensagemDoErroDeLogin(erro: { status: number; code?: string }): string {
  if (erro.code === 'PRESTADOR_INATIVO') return MENSAGENS.inativo
  if (erro.status === 400 || erro.status === 401) return MENSAGENS.credenciais
  if (erro.status === 429) return MENSAGENS.tentativas
  return MENSAGENS.indisponivel
}

export async function entrar(email: string, senha: string): Promise<ResultadoLogin> {
  try {
    const { error } = await comTempoLimite((signal) =>
      auth.signIn.email({ email, password: senha }, { signal }),
    )
    if (error) return { ok: false, mensagem: mensagemDoErroDeLogin(error) }
  } catch {
    return { ok: false, mensagem: MENSAGENS.indisponivel }
  }
  const usuario = await carregarSessao()
  if (!usuario) return { ok: false, mensagem: MENSAGENS.indisponivel }
  if (usuario.papel !== 'prestador') {
    await sair()
    return { ok: false, mensagem: MENSAGENS.papel }
  }
  return { ok: true }
}

export async function sair(): Promise<void> {
  try {
    await comTempoLimite((signal) => auth.signOut({ fetchOptions: { signal } }))
  } catch {
    // Mesmo sem API, o token local é descartado.
  } finally {
    await salvarToken(null)
    estado.usuario = null
  }
}

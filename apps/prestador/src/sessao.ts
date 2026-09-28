import type { Usuario } from '@kgb/api-client'
import { reactive, readonly } from 'vue'
import { api, auth } from './api'
import { obterToken, salvarToken } from './token'

export const MENSAGENS = {
  credenciais: 'E-mail ou senha incorretos',
  indisponivel: 'Não foi possível entrar. Verifique sua conexão e tente de novo.',
  papel: 'Esta conta é de gestor. Use o painel web.',
} as const

const estado = reactive<{ usuario: Usuario | null; carregada: boolean }>({
  usuario: null,
  carregada: false,
})
export const sessao = readonly(estado)

export async function carregarSessao(): Promise<Usuario | null> {
  estado.usuario = null
  if (obterToken()) {
    try {
      const { data, response } = await api.GET('/api/me')
      if (response.status === 401) await salvarToken(null)
      estado.usuario = data ?? null
    } catch {
      // Sem conexão: mantém o token para tentar de novo depois.
    }
  }
  estado.carregada = true
  return estado.usuario
}

export type ResultadoLogin = { ok: true } | { ok: false; mensagem: string }

export async function entrar(email: string, senha: string): Promise<ResultadoLogin> {
  try {
    const { error } = await auth.signIn.email({ email, password: senha })
    if (error) {
      const recusado = error.status >= 400 && error.status < 500
      return { ok: false, mensagem: recusado ? MENSAGENS.credenciais : MENSAGENS.indisponivel }
    }
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
    await auth.signOut()
  } catch {
    // Mesmo sem API, o token local é descartado.
  } finally {
    await salvarToken(null)
    estado.usuario = null
  }
}

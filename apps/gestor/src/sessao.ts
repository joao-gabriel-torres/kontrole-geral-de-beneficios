import type { Usuario } from '@kgb/api-client'
import { reactive, readonly } from 'vue'
import { api, auth } from './api'

export const MENSAGENS = {
  credenciais: 'E-mail ou senha incorretos',
  indisponivel: 'Não foi possível entrar. Verifique sua conexão e tente de novo.',
  papel: 'Esta conta é de prestador. Use o app do prestador.',
} as const

const estado = reactive<{ usuario: Usuario | null; carregada: boolean }>({
  usuario: null,
  carregada: false,
})
export const sessao = readonly(estado)

export async function carregarSessao(): Promise<Usuario | null> {
  try {
    const { data } = await api.GET('/api/me')
    estado.usuario = data ?? null
  } catch {
    estado.usuario = null
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
  if (usuario.papel !== 'gestor') {
    await sair()
    return { ok: false, mensagem: MENSAGENS.papel }
  }
  return { ok: true }
}

export async function sair(): Promise<void> {
  try {
    await auth.signOut()
  } catch {
    // Mesmo sem API, a sessão local é descartada.
  } finally {
    estado.usuario = null
  }
}

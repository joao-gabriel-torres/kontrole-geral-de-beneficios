import { beforeEach, describe, expect, it, vi } from 'vitest'

const { api, auth } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
}))
vi.mock('./api', () => ({ api, auth }))

const { carregarSessao, entrar, MENSAGENS, sessao } = await import('./sessao')

const gestora = { id: 'u', nome: 'Renata Silva', email: 'r@x', papel: 'gestor', prestador: null }

describe('sessão do gestor', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fica sem usuário (e não quebra) quando a API está fora do ar', async () => {
    api.GET.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await carregarSessao()).toBeNull()
    expect(sessao.carregada).toBe(true)
  })

  it('traduz credenciais inválidas', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 401 } })
    expect(await entrar('r@x', 'errada')).toEqual({ ok: false, mensagem: MENSAGENS.credenciais })
  })

  it('avisa quando não há conexão com a API', async () => {
    auth.signIn.email.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('recusa conta de prestador e encerra a sessão', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    api.GET.mockResolvedValue({ data: { ...gestora, papel: 'prestador' } })
    expect(await entrar('c@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.papel })
    expect(auth.signOut).toHaveBeenCalled()
    expect(sessao.usuario).toBeNull()
  })

  it('entra com a gestora', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    api.GET.mockResolvedValue({ data: gestora })
    expect(await entrar('r@x', 'x')).toEqual({ ok: true })
    expect(sessao.usuario?.nome).toBe('Renata Silva')
  })
})

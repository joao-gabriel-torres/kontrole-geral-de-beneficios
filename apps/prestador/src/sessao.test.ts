import { beforeEach, describe, expect, it, vi } from 'vitest'

const { api, auth, token } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
  token: { obterToken: vi.fn(), salvarToken: vi.fn(), carregarToken: vi.fn() },
}))
vi.mock('./api', () => ({ api, auth }))
vi.mock('./token', () => token)

const { carregarSessao, entrar, MENSAGENS, sessao } = await import('./sessao')
const carlos = {
  id: 'u-p1',
  nome: 'Carlos Mendes',
  email: 'c@x',
  papel: 'prestador',
  prestador: { id: 'p1', nome: 'Carlos Mendes' },
}

describe('sessão do prestador', () => {
  beforeEach(() => vi.resetAllMocks())

  it('sem token, nem chama a API', async () => {
    token.obterToken.mockReturnValue(null)
    expect(await carregarSessao()).toBeNull()
    expect(api.GET).not.toHaveBeenCalled()
  })

  it('token vencido (401) é apagado e o usuário volta ao login', async () => {
    token.obterToken.mockReturnValue('vencido')
    api.GET.mockResolvedValue({ data: undefined, response: new Response(null, { status: 401 }) })
    expect(await carregarSessao()).toBeNull()
    expect(token.salvarToken).toHaveBeenCalledWith(null)
  })

  it('API fora do ar não apaga o token nem quebra', async () => {
    token.obterToken.mockReturnValue('valido')
    api.GET.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await carregarSessao()).toBeNull()
    expect(token.salvarToken).not.toHaveBeenCalled()
    expect(sessao.carregada).toBe(true)
  })

  it('recusa conta de gestor', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    token.obterToken.mockReturnValue('t')
    api.GET.mockResolvedValue({
      data: { ...carlos, papel: 'gestor', prestador: null },
      response: new Response(),
    })
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.papel })
    expect(token.salvarToken).toHaveBeenCalledWith(null)
  })

  it('entra com o prestador', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    token.obterToken.mockReturnValue('t')
    api.GET.mockResolvedValue({ data: carlos, response: new Response() })
    expect(await entrar('c@x', 'x')).toEqual({ ok: true })
    expect(sessao.usuario?.nome).toBe('Carlos Mendes')
  })
})

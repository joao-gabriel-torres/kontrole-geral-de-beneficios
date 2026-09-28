import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { api, auth, token } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
  token: { obterToken: vi.fn(), salvarToken: vi.fn(), carregarToken: vi.fn() },
}))
vi.mock('./api', () => ({ api, auth }))
vi.mock('./token', () => token)

const { carregarSessao, entrar, mensagemDoMotivo, MENSAGENS, sessao } = await import('./sessao')
const carlos = {
  id: 'u-p1',
  nome: 'Carlos Mendes',
  email: 'c@x',
  papel: 'prestador',
  prestador: { id: 'p1', nome: 'Carlos Mendes' },
}
const resposta = (status: number) => new Response(null, { status })

describe('sessão do prestador', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => vi.useRealTimers())

  it('sem token, nem chama a API', async () => {
    token.obterToken.mockReturnValue(null)
    expect(await carregarSessao()).toBeNull()
    expect(api.GET).not.toHaveBeenCalled()
    expect(sessao.indisponivel).toBe(false)
  })

  it('token vencido (401) é apagado e o usuário volta ao login', async () => {
    token.obterToken.mockReturnValue('vencido')
    api.GET.mockResolvedValue({ data: undefined, response: resposta(401) })
    expect(await carregarSessao()).toBeNull()
    expect(token.salvarToken).toHaveBeenCalledWith(null)
    expect(sessao.indisponivel).toBe(false)
  })

  it('API fora do ar mantém o token e tenta de novo na próxima navegação', async () => {
    token.obterToken.mockReturnValue('valido')
    api.GET.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await carregarSessao()).toBeNull()
    expect(token.salvarToken).not.toHaveBeenCalled()
    expect(sessao.indisponivel).toBe(true)
    expect(sessao.carregada).toBe(false)
  })

  it('API que não responde vira indisponível depois do tempo-limite (sem tela em branco)', async () => {
    vi.useFakeTimers()
    token.obterToken.mockReturnValue('valido')
    api.GET.mockReturnValue(new Promise(() => {}))
    const carregando = carregarSessao()
    await vi.advanceTimersByTimeAsync(8000)
    expect(await carregando).toBeNull()
    expect(sessao.indisponivel).toBe(true)
    expect(token.salvarToken).not.toHaveBeenCalled()
  })

  it('erro 5xx conta como indisponível e mantém o token', async () => {
    token.obterToken.mockReturnValue('valido')
    api.GET.mockResolvedValue({ data: undefined, response: resposta(503) })
    expect(await carregarSessao()).toBeNull()
    expect(sessao.indisponivel).toBe(true)
    expect(token.salvarToken).not.toHaveBeenCalled()
  })

  it('avisa sobre excesso de tentativas em vez de dizer que a senha está errada', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 429 } })
    expect(await entrar('c@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.tentativas })
  })

  it('prestador desativado (403) é avisado de que o cadastro está inativo', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 403, code: 'PRESTADOR_INATIVO' } })
    expect(await entrar('c@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.inativo })
    expect(MENSAGENS.inativo).toBe(
      'Seu cadastro está inativo. Fale com a Russo Assistência para voltar a atender.',
    )
  })

  it('outro 403 (origem recusada pela API) não diz que o cadastro está inativo', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 403, code: 'INVALID_ORIGIN' } })
    expect(await entrar('c@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('login que não responde termina com aviso de conexão', async () => {
    vi.useFakeTimers()
    auth.signIn.email.mockReturnValue(new Promise(() => {}))
    const entrando = entrar('c@x', 'x')
    await vi.advanceTimersByTimeAsync(8000)
    expect(await entrando).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('recusa conta de gestor', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    token.obterToken.mockReturnValue('t')
    api.GET.mockResolvedValue({
      data: { ...carlos, papel: 'gestor', prestador: null },
      response: resposta(200),
    })
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.papel })
    expect(token.salvarToken).toHaveBeenCalledWith(null)
  })

  it('entra com o prestador', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    token.obterToken.mockReturnValue('t')
    api.GET.mockResolvedValue({ data: carlos, response: resposta(200) })
    expect(await entrar('c@x', 'x')).toEqual({ ok: true })
    expect(sessao.usuario?.nome).toBe('Carlos Mendes')
  })
})

describe('mensagemDoMotivo', () => {
  it('explica por que a pessoa voltou ao login', () => {
    expect(mensagemDoMotivo('papel')).toBe(MENSAGENS.papel)
    expect(mensagemDoMotivo('conexao')).toBe(MENSAGENS.indisponivel)
    expect(mensagemDoMotivo(undefined)).toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { api, auth } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
}))
vi.mock('./api', () => ({ api, auth }))

const { carregarSessao, entrar, mensagemDoMotivo, MENSAGENS, sessao } = await import('./sessao')

const gestora = { id: 'u', nome: 'Renata Silva', email: 'r@x', papel: 'gestor', prestador: null }
const resposta = (status: number) => new Response(null, { status })

describe('sessão do gestor', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => vi.useRealTimers())

  it('API fora do ar: fica sem usuário, marca indisponível e tenta de novo na próxima navegação', async () => {
    api.GET.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await carregarSessao()).toBeNull()
    expect(sessao.indisponivel).toBe(true)
    expect(sessao.carregada).toBe(false)
  })

  it('API que não responde vira indisponível depois do tempo-limite (sem tela em branco)', async () => {
    vi.useFakeTimers()
    api.GET.mockReturnValue(new Promise(() => {}))
    const carregando = carregarSessao()
    await vi.advanceTimersByTimeAsync(8000)
    expect(await carregando).toBeNull()
    expect(sessao.indisponivel).toBe(true)
  })

  it('erro 5xx (ex.: proxy sem API) conta como indisponível', async () => {
    api.GET.mockResolvedValue({ data: undefined, response: resposta(502) })
    expect(await carregarSessao()).toBeNull()
    expect(sessao.indisponivel).toBe(true)
  })

  it('401 é só "sem sessão"', async () => {
    api.GET.mockResolvedValue({ data: undefined, response: resposta(401) })
    expect(await carregarSessao()).toBeNull()
    expect(sessao.indisponivel).toBe(false)
    expect(sessao.carregada).toBe(true)
  })

  it('traduz credenciais inválidas', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 401 } })
    expect(await entrar('r@x', 'errada')).toEqual({ ok: false, mensagem: MENSAGENS.credenciais })
  })

  it('avisa sobre excesso de tentativas em vez de dizer que a senha está errada', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 429 } })
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.tentativas })
  })

  it('origem recusada (403) não vira "senha incorreta"', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 403 } })
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('avisa quando não há conexão com a API', async () => {
    auth.signIn.email.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await entrar('r@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('login que não responde termina com aviso de conexão', async () => {
    vi.useFakeTimers()
    auth.signIn.email.mockReturnValue(new Promise(() => {}))
    const entrando = entrar('r@x', 'x')
    await vi.advanceTimersByTimeAsync(8000)
    expect(await entrando).toEqual({ ok: false, mensagem: MENSAGENS.indisponivel })
  })

  it('recusa conta de prestador e encerra a sessão', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    api.GET.mockResolvedValue({ data: { ...gestora, papel: 'prestador' }, response: resposta(200) })
    expect(await entrar('c@x', 'x')).toEqual({ ok: false, mensagem: MENSAGENS.papel })
    expect(auth.signOut).toHaveBeenCalled()
    expect(sessao.usuario).toBeNull()
  })

  it('entra com a gestora', async () => {
    auth.signIn.email.mockResolvedValue({ error: null })
    api.GET.mockResolvedValue({ data: gestora, response: resposta(200) })
    expect(await entrar('r@x', 'x')).toEqual({ ok: true })
    expect(sessao.usuario?.nome).toBe('Renata Silva')
  })
})

describe('mensagemDoMotivo', () => {
  it('explica por que a pessoa voltou ao login', () => {
    expect(mensagemDoMotivo('papel')).toBe(MENSAGENS.papel)
    expect(mensagemDoMotivo('conexao')).toBe(MENSAGENS.indisponivel)
    expect(mensagemDoMotivo(undefined)).toBeNull()
  })
})

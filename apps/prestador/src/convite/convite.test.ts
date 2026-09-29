import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({ auth: { resetPassword: vi.fn() } }))
vi.mock('../api', () => ({ api: {}, auth }))

const { criarSenha, MENSAGENS_CONVITE, validarSenhas } = await import('./convite')

describe('validarSenhas', () => {
  it('pede pelo menos 8 caracteres', () => {
    expect(validarSenhas('1234567', '1234567')).toBe('Use pelo menos 8 caracteres')
  })
  it('recusa mais de 128 caracteres (limite do Better Auth)', () => {
    const longa = 'a'.repeat(129)
    expect(validarSenhas(longa, longa)).toBe('Use no máximo 128 caracteres')
  })
  it('confere a confirmação', () => {
    expect(validarSenhas('12345678', '12345679')).toBe('As senhas não conferem')
  })
  it('aceita a partir de 8 caracteres iguais', () => {
    expect(validarSenhas('12345678', '12345678')).toBeNull()
  })
})

describe('criarSenha', () => {
  beforeEach(() => vi.resetAllMocks())

  it('manda a senha nova e o token ao Better Auth', async () => {
    auth.resetPassword.mockResolvedValue({ data: { status: true }, error: null })
    expect(await criarSenha('tok-123', 'senha-nova-1')).toEqual({ ok: true })
    expect(auth.resetPassword).toHaveBeenCalledWith(
      { newPassword: 'senha-nova-1', token: 'tok-123' },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('token inválido, já usado ou vencido: convite expirado', async () => {
    auth.resetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_TOKEN' },
    })
    expect(await criarSenha('tok', 'senha-nova-1')).toEqual({
      ok: false,
      mensagem: 'Este convite expirou ou já foi usado. Peça um novo à Russo Assistência.',
      conviteInvalido: true,
    })
    expect(MENSAGENS_CONVITE.expirado).toBe(
      'Este convite expirou ou já foi usado. Peça um novo à Russo Assistência.',
    )
  })

  it('senha curta recusada pela API não invalida o convite', async () => {
    auth.resetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'PASSWORD_TOO_SHORT' },
    })
    expect(await criarSenha('tok', 'curta')).toEqual({
      ok: false,
      mensagem: MENSAGENS_CONVITE.curta,
      conviteInvalido: false,
    })
  })

  it('muitas tentativas', async () => {
    auth.resetPassword.mockResolvedValue({ data: null, error: { status: 429 } })
    expect(await criarSenha('tok', 'senha-nova-1')).toMatchObject({
      ok: false,
      mensagem: 'Muitas tentativas. Aguarde alguns segundos e tente de novo.',
    })
  })

  it('sem conexão com a API', async () => {
    auth.resetPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await criarSenha('tok', 'senha-nova-1')).toEqual({
      ok: false,
      mensagem: 'Não foi possível criar a senha. Verifique sua conexão e tente de novo.',
      conviteInvalido: false,
    })
  })
})

import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montar } from '../../test/montar'

const { api, auth, token } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn(), resetPassword: vi.fn() },
  token: { obterToken: vi.fn(), salvarToken: vi.fn(), carregarToken: vi.fn() },
}))
vi.mock('../api', () => ({ api, auth }))
vi.mock('../token', () => token)

const { avisoDoMotivo } = await import('../sessao')
const { default: PaginaLogin } = await import('../paginas/PaginaLogin.vue')

const AVISO = 'Senha criada. Entre com seu e-mail e a nova senha.'

describe('aviso de senha criada no login', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => document.body.replaceChildren())

  it('avisoDoMotivo reconhece só a senha criada', () => {
    expect(avisoDoMotivo('senha-criada')).toBe(AVISO)
    expect(avisoDoMotivo('papel')).toBeNull()
    expect(avisoDoMotivo(undefined)).toBeNull()
  })

  it('login com ?motivo=senha-criada mostra o aviso, sem erro', async () => {
    const { wrapper: tela } = await montar(PaginaLogin, {
      rotaInicial: '/login?motivo=senha-criada',
    })
    // O texto entra na região viva depois de montar (senão o leitor de tela não anuncia).
    await flushPromises()
    expect(tela.find('p[role="status"]').text()).toBe(AVISO)
    expect(tela.find('p[role="alert"]').exists()).toBe(false)
  })

  it('o aviso some ao tentar entrar', async () => {
    auth.signIn.email.mockResolvedValue({ error: { status: 401 } })
    const { wrapper: tela } = await montar(PaginaLogin, {
      rotaInicial: '/login?motivo=senha-criada',
    })
    await tela.find('#login-email').setValue('ana@teste.dev')
    await tela.find('#login-senha').setValue('errada-123')
    await tela.find('form').trigger('submit')
    await flushPromises()
    // A região viva continua montada; só o texto do aviso sai.
    expect(tela.find('p[role="status"]').text()).toBe('')
    expect(tela.find('p[role="alert"]').text()).toBe('E-mail ou senha incorretos')
  })

  it('sem motivo, o login mostra a região viva vazia', async () => {
    const { wrapper: tela } = await montar(PaginaLogin, { rotaInicial: '/login' })
    await flushPromises()
    const regiao = tela.find('p[role="status"]')
    expect(regiao.exists()).toBe(true)
    expect(regiao.text()).toBe('')
  })
})

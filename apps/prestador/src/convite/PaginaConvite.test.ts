import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { montar, ROTAS_VAZIAS } from '../../test/montar'

const { auth, sessao, sair } = vi.hoisted(() => ({
  auth: { resetPassword: vi.fn() },
  sessao: { usuario: null as null | { papel: string } },
  sair: vi.fn(),
}))
vi.mock('../api', () => ({ api: {}, auth }))
vi.mock('../sessao', () => ({ sessao, sair }))

const { default: PaginaConvite } = await import('./PaginaConvite.vue')

const ROTAS: RouteRecordRaw[] = [
  ...ROTAS_VAZIAS,
  { path: '/convite', name: 'convite', component: { template: '<div />' } },
]
const EXPIRADO = 'Este convite expirou ou já foi usado. Peça um novo à Russo Assistência.'

const abrir = (busca = '?token=tok-123') =>
  montar(PaginaConvite, { rotas: ROTAS, rotaInicial: `/convite${busca}` })

async function preencher(tela: VueWrapper, senha: string, confirmacao: string) {
  await tela.find('#convite-senha').setValue(senha)
  await tela.find('#convite-confirmacao').setValue(confirmacao)
}

async function enviar(tela: VueWrapper) {
  await tela.find('form').trigger('submit')
  await flushPromises()
}

const botao = (tela: VueWrapper) => tela.find('button[type="submit"]')
const alerta = (tela: VueWrapper) => tela.find('p[role="alert"]')

describe('PaginaConvite', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessao.usuario = null
  })
  afterEach(() => document.body.replaceChildren())

  it('mostra o cartão com título, apoio, os dois campos e o botão desabilitado', async () => {
    const { wrapper: tela } = await abrir()
    expect(tela.find('h1').text()).toBe('Crie sua senha')
    expect(tela.find('.apoio').text()).toBe('Para entrar no app da Russo Assistência')
    expect(tela.find('label[for="convite-senha"]').text()).toBe('Nova senha')
    expect(tela.find('label[for="convite-confirmacao"]').text()).toBe('Confirmar senha')
    expect(tela.find('#convite-senha').attributes('autocomplete')).toBe('new-password')
    expect(botao(tela).text()).toBe('Criar senha')
    expect(botao(tela).attributes('disabled')).toBeDefined()
    expect(alerta(tela).exists()).toBe(false)
  })

  it('senha curta: "Use pelo menos 8 caracteres", sem chamar a API', async () => {
    const { wrapper: tela } = await abrir()
    await preencher(tela, '1234567', '1234567')
    await enviar(tela)
    expect(alerta(tela).text()).toBe('Use pelo menos 8 caracteres')
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it('senhas diferentes: "As senhas não conferem", sem chamar a API', async () => {
    const { wrapper: tela } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-2')
    await enviar(tela)
    expect(alerta(tela).text()).toBe('As senhas não conferem')
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it('cria a senha com o token do link e vai para o login com o aviso', async () => {
    auth.resetPassword.mockResolvedValue({ data: { status: true }, error: null })
    const { wrapper: tela, router } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    await enviar(tela)
    expect(auth.resetPassword).toHaveBeenCalledWith(
      { newPassword: 'senha-nova-1', token: 'tok-123' },
      expect.anything(),
    )
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ motivo: 'senha-criada' })
    expect(sair).not.toHaveBeenCalled()
  })

  it('token vencido: mensagem de convite expirado, botão desabilitado e caminho para o login', async () => {
    auth.resetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_TOKEN' },
    })
    const { wrapper: tela, router } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    await enviar(tela)
    expect(alerta(tela).text()).toBe(EXPIRADO)
    expect(botao(tela).attributes('disabled')).toBeDefined()
    expect(router.currentRoute.value.name).toBe('convite')
    const link = tela.find('a.ir-login')
    expect(link.text()).toBe('Ir para o login')
    expect(link.attributes('href')).toBe('/login')
  })

  it('sem token no link: já abre com a mensagem de convite expirado', async () => {
    const { wrapper: tela } = await abrir('')
    expect(alerta(tela).text()).toBe(EXPIRADO)
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    expect(botao(tela).attributes('disabled')).toBeDefined()
    await enviar(tela)
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it('erro de conexão mantém a tela para tentar de novo', async () => {
    auth.resetPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    const { wrapper: tela } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    await enviar(tela)
    expect(alerta(tela).text()).toBe(
      'Não foi possível criar a senha. Verifique sua conexão e tente de novo.',
    )
    expect(botao(tela).attributes('disabled')).toBeUndefined()
  })

  it('não envia duas vezes enquanto cria a senha', async () => {
    auth.resetPassword.mockReturnValue(new Promise(() => {}))
    const { wrapper: tela } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    await enviar(tela)
    await enviar(tela)
    expect(auth.resetPassword).toHaveBeenCalledTimes(1)
  })

  it('com outra conta aberta no aparelho, sai dela antes de ir ao login', async () => {
    sessao.usuario = { papel: 'prestador' }
    auth.resetPassword.mockResolvedValue({ data: { status: true }, error: null })
    const { wrapper: tela, router } = await abrir()
    await preencher(tela, 'senha-nova-1', 'senha-nova-1')
    await enviar(tela)
    expect(sair).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('login')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { aguardar, montar } from '../../test/montar'
import { novoAcionamento } from '../acionamentos/novo/estado'
import { sair } from '../sessao'
import PaginaPainel from './PaginaPainel.vue'

vi.mock('../sessao', () => ({ sessao: { usuario: { nome: 'Renata Silva' } }, sair: vi.fn() }))

const larguraOriginal = window.innerWidth
function telaDe(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura })
}

describe('PaginaPainel', () => {
  afterEach(() => telaDe(larguraOriginal))

  it('"Novo acionamento" abre o modal', async () => {
    novoAcionamento.fechar()
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('h1').text()).toBe('Seu painel')
    await tela.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
    novoAcionamento.fechar()
  })

  it('no celular, o avatar abre o menu com "Sair", que volta ao login', async () => {
    telaDe(375)
    const { tela, router } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.conta').text()).toBe('RS')
    await tela.find('.conta [aria-haspopup="menu"]').trigger('click')
    await tela.find('[role="menuitem"]').trigger('click')
    await aguardar()
    expect(sair).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('no computador, a conta fica só na barra lateral', async () => {
    telaDe(1440)
    const { tela } = await montar(PaginaPainel, { rota: '/painel' })
    expect(tela.find('.conta').exists()).toBe(false)
  })
})

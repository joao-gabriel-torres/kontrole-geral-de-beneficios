import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { novoAcionamento } from '../acionamentos/novo/estado'
import PaginaPainel from './PaginaPainel.vue'

describe('PaginaPainel', () => {
  it('"Novo acionamento" abre o modal', async () => {
    novoAcionamento.fechar()
    const painel = mount(PaginaPainel)
    expect(painel.find('h1').text()).toBe('Seu painel')
    await painel.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
  })
})

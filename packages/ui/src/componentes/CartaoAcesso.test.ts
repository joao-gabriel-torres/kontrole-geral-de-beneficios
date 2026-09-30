import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { CartaoAcesso } from '..'

const montar = () =>
  mount(CartaoAcesso, {
    props: { titulo: 'Crie sua senha', apoio: 'Para entrar no app da Russo Assistência' },
    slots: {
      default:
        '<div class="campo"><label for="campo-x">Nova senha</label><input id="campo-x" /></div>',
    },
  })

describe('CartaoAcesso', () => {
  it('mostra a marca, o título, o apoio e o conteúdo dentro do formulário', () => {
    const tela = montar()
    expect(tela.find('.nome-marca').text()).toBe('RUSSO ASSISTÊNCIA')
    expect(tela.find('h1').text()).toBe('Crie sua senha')
    expect(tela.find('.apoio').text()).toBe('Para entrar no app da Russo Assistência')
    expect(tela.find('form label[for="campo-x"]').text()).toBe('Nova senha')
  })

  it('emite enviar ao submeter o formulário', async () => {
    const tela = montar()
    await tela.find('form').trigger('submit')
    expect(tela.emitted('enviar')).toHaveLength(1)
  })
})

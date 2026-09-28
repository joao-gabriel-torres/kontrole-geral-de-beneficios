import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CartaoDecisao from './CartaoDecisao.vue'

const montar = (inviavel: boolean, enviando = false) =>
  mount(CartaoDecisao, { props: { inviavel, enviando, observacao: '' } })

describe('CartaoDecisao', () => {
  it('conclusão: "Confira e decida", "Aprovar conclusão" e "Reprovar"', () => {
    const c = montar(false)
    expect(c.find('.titulo').text()).toBe('Confira e decida')
    expect(c.find('.aprovar').text()).toBe('Aprovar conclusão')
    expect(c.find('.reprovar').text()).toBe('Reprovar')
    expect(c.find('textarea').attributes('placeholder')).toBe(
      'Observação para o prestador (obrigatória para reprovar)',
    )
  })
  it('inviabilidade: "Confirmar inviabilidade" e "Recusar inviabilidade"', () => {
    const c = montar(true)
    expect(c.find('.titulo').text()).toBe('O prestador marcou como inviável')
    expect(c.find('.aprovar').text()).toBe('Confirmar inviabilidade')
    expect(c.find('.reprovar').text()).toBe('Recusar inviabilidade')
  })
  it('avisa a decisão com a observação digitada', async () => {
    const c = montar(false)
    await c.find('textarea').setValue('Falta a foto do quadro')
    await c.find('.reprovar').trigger('click')
    await c.find('.aprovar').trigger('click')
    expect(c.emitted('decidir')).toEqual([
      ['reprovado', 'Falta a foto do quadro'],
      ['aprovado', 'Falta a foto do quadro'],
    ])
  })
  it('enquanto envia, os botões ficam travados', () => {
    const c = montar(false, true)
    expect(c.find('.aprovar').attributes('disabled')).toBeDefined()
    expect(c.find('.reprovar').attributes('disabled')).toBeDefined()
  })
})

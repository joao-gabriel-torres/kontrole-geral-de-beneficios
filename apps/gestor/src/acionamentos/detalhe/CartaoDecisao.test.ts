import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CartaoDecisao from './CartaoDecisao.vue'
import type { Decisao } from './decisao'

const montar = (inviavel: boolean, enviando: Decisao | null = null) =>
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
  it('em repouso, nada travado nem ocupado', () => {
    const c = montar(false)
    for (const botao of [c.find('.aprovar'), c.find('.reprovar')]) {
      expect(botao.attributes('disabled')).toBeUndefined()
      expect(botao.attributes('aria-busy')).toBeUndefined()
    }
  })
  it('enquanto envia, os dois botões travam e só o clicado diz "Enviando…"', () => {
    const c = montar(false, 'reprovado')
    expect(c.find('.aprovar').attributes('disabled')).toBeDefined()
    expect(c.find('.reprovar').attributes('disabled')).toBeDefined()
    expect(c.find('.reprovar').text()).toBe('Enviando…')
    expect(c.find('.reprovar').attributes('aria-busy')).toBe('true')
    expect(c.find('.aprovar').text()).toBe('Aprovar conclusão')
    expect(c.find('.aprovar').attributes('aria-busy')).toBeUndefined()
  })
  it('inviabilidade: confirmando, o botão de confirmar diz "Enviando…"', () => {
    const c = montar(true, 'aprovado')
    expect(c.find('.aprovar').text()).toBe('Enviando…')
    expect(c.find('.aprovar').attributes('aria-busy')).toBe('true')
    expect(c.find('.reprovar').text()).toBe('Recusar inviabilidade')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusChip from './StatusChip.vue'

describe('StatusChip', () => {
  it('mostra rótulo e cores do status', () => {
    const chip = mount(StatusChip, { props: { status: 'reprovado' } })
    expect(chip.text()).toBe('Reprovado')
    expect(chip.attributes('style')).toContain('background: rgb(255, 215, 212)')
  })
  it('usa o rótulo de inviabilidade em análise', () => {
    expect(mount(StatusChip, { props: { status: 'aguardando', inviavel: true } }).text()).toBe(
      'Inviabilidade em análise',
    )
  })
  it('aplica os três tamanhos do protótipo', () => {
    expect(mount(StatusChip, { props: { status: 'aberto', tamanho: 'p' } }).classes()).toContain(
      'p',
    )
    expect(mount(StatusChip, { props: { status: 'aberto' } }).classes()).toContain('m')
  })
})

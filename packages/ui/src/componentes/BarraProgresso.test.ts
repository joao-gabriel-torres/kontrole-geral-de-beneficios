import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BarraProgresso from './BarraProgresso.vue'

describe('BarraProgresso', () => {
  it('preenche o percentual sobre o trilho', () => {
    const b = mount(BarraProgresso, { props: { percentual: 60, trilho: '#E5E5E5' } })
    expect(b.attributes('style')).toContain('background: rgb(229, 229, 229)')
    expect(b.find('.preenchimento').attributes('style')).toContain('width: 60%')
    expect(b.attributes('role')).toBe('progressbar')
    expect(b.attributes('aria-valuenow')).toBe('60')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MenuUsuario from './MenuUsuario.vue'

describe('MenuUsuario', () => {
  it('fica fechado até a pessoa tocar no gatilho', async () => {
    const menu = mount(MenuUsuario, { slots: { default: '<span class="avatar">CM</span>' } })
    expect(menu.find('[role="menuitem"]').exists()).toBe(false)
    await menu.find('.gatilho').trigger('click')
    expect(menu.find('[role="menuitem"]').text()).toBe('Sair')
    expect(menu.find('.gatilho').attributes('aria-expanded')).toBe('true')
  })

  it('emite "sair" e fecha', async () => {
    const menu = mount(MenuUsuario, { slots: { default: 'RS' } })
    await menu.find('.gatilho').trigger('click')
    await menu.find('[role="menuitem"]').trigger('click')
    expect(menu.emitted('sair')).toHaveLength(1)
    expect(menu.find('[role="menuitem"]').exists()).toBe(false)
  })
})

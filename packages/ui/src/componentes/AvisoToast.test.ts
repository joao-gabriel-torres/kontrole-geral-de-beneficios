import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usarToast } from '../toast'
import AvisoToast from './AvisoToast.vue'

describe('AvisoToast', () => {
  it('mostra a mensagem com a variante do app', () => {
    const t = mount(AvisoToast, {
      props: { mensagem: 'Atendimento iniciado', variante: 'prestador' },
    })
    const toast = t.find('.toast')
    expect(toast.text()).toBe('Atendimento iniciado')
    expect(toast.classes()).toContain('prestador')
    expect(toast.attributes('role')).toBe('status')
  })

  it('a região viva fica sempre montada: sem mensagem, existe e está vazia', () => {
    const t = mount(AvisoToast, { props: { mensagem: null, variante: 'gestor' } })
    const regiao = t.find('[aria-live="polite"]')
    expect(regiao.exists()).toBe(true)
    expect(regiao.attributes('aria-atomic')).toBe('true')
    expect(regiao.text()).toBe('')
    expect(t.find('.toast').exists()).toBe(false)
  })

  it('a mensagem entra na região que já existia (é isso que o leitor de tela anuncia)', async () => {
    const t = mount(AvisoToast, { props: { mensagem: null, variante: 'prestador' } })
    const regiao = t.find('[aria-live="polite"]').element
    await t.setProps({ mensagem: 'Conclusão aprovada' })
    expect(t.find('[aria-live="polite"]').element).toBe(regiao)
    expect(regiao.textContent?.trim()).toBe('Conclusão aprovada')
    await t.setProps({ mensagem: null })
    expect(t.find('[aria-live="polite"]').element).toBe(regiao)
    expect(regiao.textContent?.trim()).toBe('')
  })
})

describe('usarToast', () => {
  afterEach(() => vi.useRealTimers())

  it('some depois de 2,6 s', () => {
    vi.useFakeTimers()
    const toast = usarToast()
    toast.mostrar('Enviado para aprovação')
    expect(toast.mensagem.value).toBe('Enviado para aprovação')
    vi.advanceTimersByTime(2599)
    expect(toast.mensagem.value).toBe('Enviado para aprovação')
    vi.advanceTimersByTime(1)
    expect(toast.mensagem.value).toBeNull()
  })
  it('mensagem nova substitui a anterior e o prazo recomeça', () => {
    vi.useFakeTimers()
    const toast = usarToast()
    toast.mostrar('Primeira')
    vi.advanceTimersByTime(2000)
    toast.mostrar('Segunda')
    vi.advanceTimersByTime(2000)
    expect(toast.mensagem.value).toBe('Segunda')
    vi.advanceTimersByTime(600)
    expect(toast.mensagem.value).toBeNull()
  })
})

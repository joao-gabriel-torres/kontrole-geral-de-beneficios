import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usarToast } from '../toast'
import AvisoToast from './AvisoToast.vue'

describe('AvisoToast', () => {
  it('mostra a mensagem com a variante do app', () => {
    const t = mount(AvisoToast, {
      props: { mensagem: 'Atendimento iniciado', variante: 'prestador' },
    })
    expect(t.text()).toBe('Atendimento iniciado')
    expect(t.classes()).toContain('prestador')
    expect(t.attributes('role')).toBe('status')
  })
  it('sem mensagem, não renderiza', () => {
    expect(mount(AvisoToast, { props: { mensagem: null, variante: 'gestor' } }).html()).toBe(
      '<!--v-if-->',
    )
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

import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { sessao } from '../sessao'
import { periodoPainel } from './estado'

vi.mock('../sessao', async () => {
  const { reactive } = await import('vue')
  return { sessao: reactive({ usuario: { nome: 'Renata Silva' } as { nome: string } | null }) }
})

describe('periodoPainel', () => {
  it('começa em 7 dias', () => {
    expect(periodoPainel.value).toBe(7)
  })

  it('volta a 7 dias quando a sessão acaba (sair da conta ou sessão recusada)', async () => {
    periodoPainel.value = 30
    ;(sessao as { usuario: unknown }).usuario = null
    await nextTick()
    expect(periodoPainel.value).toBe(7)
  })
})

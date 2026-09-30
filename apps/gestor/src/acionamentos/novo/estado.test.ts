import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const { sessao } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return { sessao: reactive<{ usuario: { id: string } | null }>({ usuario: { id: 'u1' } }) }
})
vi.mock('../../sessao', () => ({ sessao }))

const { novoAcionamento } = await import('./estado')

describe('estado do Novo acionamento', () => {
  it('abre e fecha', () => {
    novoAcionamento.abrir()
    expect(novoAcionamento.aberto.value).toBe(true)
    novoAcionamento.fechar()
    expect(novoAcionamento.aberto.value).toBe(false)
  })

  it('fecha na troca de conta (saída, sessão recusada ou outro login)', async () => {
    novoAcionamento.abrir()
    sessao.usuario = null
    await nextTick()
    expect(novoAcionamento.aberto.value).toBe(false)

    novoAcionamento.abrir()
    sessao.usuario = { id: 'u2' }
    await nextTick()
    expect(novoAcionamento.aberto.value).toBe(false)
  })
})

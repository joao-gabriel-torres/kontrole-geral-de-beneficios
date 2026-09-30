import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const { sessao } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return { sessao: reactive<{ usuario: { id: string } | null }>({ usuario: { id: 'u1' } }) }
})
vi.mock('../sessao', () => ({ sessao }))

const { tipoSelecionado } = await import('./selecao')

describe('tipo selecionado em Checklists', () => {
  it('volta ao primeiro da lista (null) na troca de conta', async () => {
    tipoSelecionado.value = 't6'
    sessao.usuario = null
    await nextTick()
    expect(tipoSelecionado.value).toBeNull()

    tipoSelecionado.value = 't6'
    sessao.usuario = { id: 'u2' }
    await nextTick()
    expect(tipoSelecionado.value).toBeNull()
  })
})

import { MutationObserver } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { criarClienteConsultas } from './consultas'
import { ErroApi } from './erros'

describe('criarClienteConsultas', () => {
  it('401 numa consulta ou ação avisa que a sessão caiu; outros erros não', async () => {
    const aoPerderSessao = vi.fn()
    const consultas = criarClienteConsultas(aoPerderSessao)
    const falhar = (status: number) => () => Promise.reject(new ErroApi('falhou', 'x', status))

    await consultas
      .fetchQuery({ queryKey: ['a'], queryFn: falhar(500), retry: false })
      .catch(() => {})
    expect(aoPerderSessao).not.toHaveBeenCalled()
    await consultas
      .fetchQuery({ queryKey: ['b'], queryFn: falhar(401), retry: false })
      .catch(() => {})
    expect(aoPerderSessao).toHaveBeenCalledTimes(1)
    await new MutationObserver(consultas, { mutationFn: falhar(401) }).mutate().catch(() => {})
    expect(aoPerderSessao).toHaveBeenCalledTimes(2)
  })
})

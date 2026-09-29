import { ErroTempoEsgotado } from '@kgb/api-client'
import { MutationObserver } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarClienteConsultas, deveRepetir } from './consultas'
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

describe('repetição das consultas', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Consulta que sempre falha com `erro`, pela política padrão do cliente do gestor. */
  async function buscar(erro: unknown) {
    const aoPerderSessao = vi.fn()
    const consultas = criarClienteConsultas(aoPerderSessao)
    const queryFn = vi.fn(() => Promise.reject(erro))
    let terminou = false
    const resultado = consultas.fetchQuery({ queryKey: ['x'], queryFn }).then(
      () => 'sem erro',
      (e: unknown) => {
        terminou = true
        return e
      },
    )
    await vi.advanceTimersByTimeAsync(0)
    return { queryFn, resultado, aoPerderSessao, terminou: () => terminou }
  }

  it('4xx não repete: o 404 e a volta ao login (401) chegam na hora', async () => {
    const erro404 = new ErroApi('Acionamento não encontrado', 'nao_encontrado', 404)
    const naoEncontrado = await buscar(erro404)
    expect(naoEncontrado.terminou()).toBe(true)
    expect(naoEncontrado.queryFn).toHaveBeenCalledTimes(1)
    expect(await naoEncontrado.resultado).toBe(erro404)

    const semSessao = await buscar(new ErroApi('Faça login para continuar', 'nao_autenticado', 401))
    expect(semSessao.terminou()).toBe(true)
    expect(semSessao.queryFn).toHaveBeenCalledTimes(1)
    expect(semSessao.aoPerderSessao).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['5xx', new ErroApi('Erro interno', 'interno', 500)],
    ['falha de rede', new TypeError('Failed to fetch')],
  ])('%s repete uma vez, depois de 1 s', async (_, erro) => {
    const { queryFn, resultado } = await buscar(erro)
    expect(queryFn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(queryFn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(queryFn).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(await resultado).toBe(erro)
  })

  it('tempo esgotado não repete: a gestora já esperou o limite inteiro', async () => {
    const erro = new ErroTempoEsgotado()
    const { queryFn, resultado } = await buscar(erro)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(await resultado).toBe(erro)
  })
})

describe('deveRepetir', () => {
  it('só a primeira falha de 5xx ou de rede', () => {
    expect(deveRepetir(0, new ErroApi('x', 'x', 503))).toBe(true)
    expect(deveRepetir(1, new ErroApi('x', 'x', 503))).toBe(false)
    expect(deveRepetir(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(deveRepetir(1, new TypeError('Failed to fetch'))).toBe(false)
  })

  it('nunca repete 4xx nem tempo esgotado', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 499]) {
      expect(deveRepetir(0, new ErroApi('x', 'x', status))).toBe(false)
    }
    expect(deveRepetir(0, new ErroTempoEsgotado())).toBe(false)
  })
})

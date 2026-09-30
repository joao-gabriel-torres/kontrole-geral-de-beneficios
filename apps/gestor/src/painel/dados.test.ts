import { ErroTempoEsgotado } from '@kgb/api-client'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { nuncaResponde, simularApi } from '../../test/api-falsa'
import { criarClienteDeTeste } from '../../test/montar'
import { api } from '../api'
import { MENSAGEM_FALHA, mensagemDeErro } from '../erros'
import { chavePainel, usarPainel } from './dados'
import { painelDoSeed } from './fixtures-painel'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

/** Monta um componente que só chama `usarPainel(7)` e devolve o que ele expôs. */
function montarPainel() {
  let exposto!: ReturnType<typeof usarPainel>
  const Teste = defineComponent({
    setup() {
      exposto = usarPainel(7)
      return () => h('div')
    },
  })
  const consultas = criarClienteDeTeste()
  const tela = mount(Teste, { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } })
  return { uso: () => exposto, consultas, tela }
}

describe('usarPainel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sem resposta em 8 s, falha com a mensagem de conexão e aborta o pedido', async () => {
    const simulada = simularApi(api, { 'GET /api/painel': nuncaResponde })
    const { uso } = montarPainel()
    await vi.advanceTimersByTimeAsync(7_999)
    expect(uso().isError.value).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(uso().error.value).toBeInstanceOf(ErroTempoEsgotado)
    expect(mensagemDeErro(uso().error.value)).toBe(MENSAGEM_FALHA)
    expect(simulada.chamadas('GET', '/api/painel')[0]!.signal!.aborted).toBe(true)
  })

  it('os números ficam 30 min no cache sem observadores (voltar do Detalhe não abre página vazia)', async () => {
    simularApi(api, { 'GET /api/painel': painelDoSeed() })
    const { consultas, tela } = montarPainel()
    await vi.advanceTimersByTimeAsync(0)
    expect(consultas.getQueryData(chavePainel(7))).toBeDefined()
    tela.unmount()
    await vi.advanceTimersByTimeAsync(29 * 60_000)
    expect(consultas.getQueryData(chavePainel(7))).toBeDefined()
    await vi.advanceTimersByTimeAsync(2 * 60_000)
    expect(consultas.getQueryData(chavePainel(7))).toBeUndefined()
  })
})

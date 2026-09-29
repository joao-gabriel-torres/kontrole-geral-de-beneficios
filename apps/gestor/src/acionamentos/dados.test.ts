import { ErroTempoEsgotado } from '@kgb/api-client'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, type Ref } from 'vue'
import { aguardar, criarClienteDeTeste } from '../../test/montar'
import { nuncaResponde, simularApi } from '../../test/api-falsa'
import { contagem, detalhe, resumo } from '../../test/fixtures'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { MENSAGEM_FALHA, mensagemDeErro } from '../erros'
import {
  usarContagem,
  usarCriarAcionamento,
  usarDetalhe,
  usarLista,
  usarPrestadoresAtivos,
  usarRevisao,
  usarTipos,
  type NovoAcionamento,
} from './dados'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

/** Monta um componente que só chama `usar()` e devolve o que ele expôs. */
function montarUso<T>(usar: () => T) {
  let exposto!: T
  const Teste = defineComponent({
    setup() {
      exposto = usar()
      return () => h('div')
    },
  })
  const consultas = criarClienteDeTeste()
  mount(Teste, { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } })
  return { uso: () => exposto, consultas }
}

function montarComposables() {
  const { uso, consultas } = montarUso(() => {
    usarContagem()
    usarLista('aguardando')
    return { revisar: usarRevisao('a1059'), criar: usarCriarAcionamento() }
  })
  return { expostos: uso, consultas }
}

describe('composables de acionamentos', () => {
  let simulada: ReturnType<typeof simularApi>
  beforeEach(() => {
    simulada = simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/acionamentos': [resumo()],
      'POST /api/acionamentos/{id}/revisao': detalhe({ status: 'aprovado' }),
      'POST /api/acionamentos': resumo({ id: 'a2000' }),
    })
  })

  it('a lista manda o status do filtro e omite a busca vazia', async () => {
    montarComposables()
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos')[0]!.params!.query).toEqual({
      status: 'aguardando',
      busca: undefined,
    })
  })

  it('depois de revisar, grava o detalhe e recarrega contagem e lista', async () => {
    const { expostos, consultas } = montarComposables()
    await aguardar()
    await expostos().revisar.mutateAsync({ decisao: 'aprovado' })
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]).toMatchObject({
      params: { path: { id: 'a1059' } },
      body: { decisao: 'aprovado' },
    })
    expect(consultas.getQueryData(CHAVES.detalhe('a1059'))).toMatchObject({ status: 'aprovado' })
    expect(simulada.chamadas('GET', '/api/acionamentos/contagem')).toHaveLength(2)
    expect(simulada.chamadas('GET', '/api/acionamentos')).toHaveLength(2)
  })

  it('depois de criar, recarrega contagem e lista', async () => {
    const { expostos } = montarComposables()
    await aguardar()
    await expostos().criar.mutateAsync({
      titulo: 'T',
      cliente: 'C',
      endereco: 'E',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos/contagem')).toHaveLength(2)
  })
})

/** Acompanha uma promessa sem esperar por ela (com timers falsos, esperar poderia travar). */
function acompanhar(promessa: Promise<unknown>) {
  const estado: { terminou: boolean; valor?: unknown } = { terminou: false }
  promessa.then(
    (valor) => Object.assign(estado, { terminou: true, valor }),
    (erro: unknown) => Object.assign(estado, { terminou: true, valor: erro }),
  )
  return estado
}

const NOVO: NovoAcionamento = {
  titulo: 'T',
  cliente: 'C',
  endereco: 'E',
  data: '2026-09-28',
  inicio: '09:00',
  fim: '11:00',
  tipoIds: ['t1'],
  prestadorId: 'p1',
}

describe('tempo limite das chamadas de dados', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  type UsoConsulta = () => { isError: Ref<boolean>; error: Ref<Error | null> }
  const CONSULTAS: [string, string, UsoConsulta][] = [
    ['contagem', '/api/acionamentos/contagem', () => usarContagem()],
    ['lista', '/api/acionamentos', () => usarLista('todos')],
    ['detalhe', '/api/acionamentos/{id}', () => usarDetalhe('a1059')],
    ['tipos', '/api/tipos', () => usarTipos()],
    ['prestadores ativos', '/api/prestadores', () => usarPrestadoresAtivos()],
  ]

  it.each(CONSULTAS)(
    '%s: sem resposta em 8 s, falha com a mensagem de conexão e aborta o pedido',
    async (_, caminho, usar) => {
      const simulada = simularApi(api, { [`GET ${caminho}`]: nuncaResponde })
      const { uso } = montarUso(usar)
      await vi.advanceTimersByTimeAsync(7_999)
      expect(uso().isError.value).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(uso().error.value).toBeInstanceOf(ErroTempoEsgotado)
      expect(mensagemDeErro(uso().error.value)).toBe(MENSAGEM_FALHA)
      expect(simulada.chamadas('GET', caminho)[0]!.signal!.aborted).toBe(true)
    },
  )

  it('cancelar a consulta (sair da tela) continua abortando o pedido', async () => {
    const simulada = simularApi(api, { 'GET /api/acionamentos/{id}': nuncaResponde })
    const { consultas } = montarUso(() => usarDetalhe('a1059'))
    await vi.advanceTimersByTimeAsync(0)
    const sinal = simulada.chamadas('GET', '/api/acionamentos/{id}')[0]!.signal!
    expect(sinal.aborted).toBe(false)
    await consultas.cancelQueries({ queryKey: CHAVES.detalhe('a1059') })
    expect(sinal.aborted).toBe(true)
  })

  /** Cada caso monta a ação e devolve a função que a dispara. */
  const ACOES: [string, string, () => () => Promise<unknown>][] = [
    [
      'criar',
      '/api/acionamentos',
      () => {
        const criar = usarCriarAcionamento()
        return () => criar.mutateAsync(NOVO)
      },
    ],
    [
      'revisar',
      '/api/acionamentos/{id}/revisao',
      () => {
        const revisar = usarRevisao('a1059')
        return () => revisar.mutateAsync({ decisao: 'aprovado' })
      },
    ],
  ]

  it.each(ACOES)(
    '%s: sem resposta em 8 s, a ação falha com tempo esgotado e aborta o pedido',
    async (_, caminho, usar) => {
      const simulada = simularApi(api, {
        'GET /api/acionamentos/contagem': contagem(),
        'GET /api/acionamentos': [],
        [`POST ${caminho}`]: nuncaResponde,
      })
      const { uso } = montarUso(usar)
      const resultado = acompanhar(uso()())
      await vi.advanceTimersByTimeAsync(7_999)
      expect(resultado.terminou).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(resultado.terminou).toBe(true)
      expect(resultado.valor).toBeInstanceOf(ErroTempoEsgotado)
      expect(simulada.chamadas('POST', caminho)[0]!.signal!.aborted).toBe(true)
    },
  )
})

import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { aguardar, criarClienteDeTeste } from '../../test/montar'
import { simularApi } from '../../test/api-falsa'
import { contagem, detalhe, resumo } from '../../test/fixtures'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { usarContagem, usarCriarAcionamento, usarLista, usarRevisao } from './dados'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

function montarComposables() {
  let expostos!: {
    revisar: ReturnType<typeof usarRevisao>
    criar: ReturnType<typeof usarCriarAcionamento>
  }
  const Teste = defineComponent({
    setup() {
      usarContagem()
      usarLista('aguardando')
      expostos = { revisar: usarRevisao('a1059'), criar: usarCriarAcionamento() }
      return () => h('div')
    },
  })
  const consultas = criarClienteDeTeste()
  mount(Teste, { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } })
  return { expostos: () => expostos, consultas }
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

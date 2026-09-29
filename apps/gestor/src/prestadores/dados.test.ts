import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { erroApi, simularApi, type RespostaFalsa } from '../../test/api-falsa'
import { aguardar, criarClienteDeTeste } from '../../test/montar'
import { api } from '../api'
import {
  CHAVES_PRESTADORES,
  usarAlterarStatus,
  usarCadastro,
  usarExcluirPrestador,
  usarSalvarPrestador,
} from './dados'
import { estadoPrestadores, reiniciarPrestadores } from './estado'
import type { PrestadorCadastro } from './lista'
import { baixarModeloPlanilha, exportarPlanilha } from './planilha/acoes'
import { importacao } from './planilha/estado'
import { prestador, SEED_PRESTADORES } from './teste/dados'

const { sessaoFalsa } = vi.hoisted(() => ({ sessaoFalsa: { usuario: { id: 'u-renata' } } }))
vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../sessao', async () => {
  const { reactive: reativo } = await import('vue')
  return { sessao: reativo(sessaoFalsa), sair: vi.fn() }
})

function montarComposables() {
  let expostos!: {
    cadastro: ReturnType<typeof usarCadastro>
    salvar: ReturnType<typeof usarSalvarPrestador>
    status: ReturnType<typeof usarAlterarStatus>
    excluir: ReturnType<typeof usarExcluirPrestador>
  }
  const Teste = defineComponent({
    setup() {
      expostos = {
        cadastro: usarCadastro(),
        salvar: usarSalvarPrestador(),
        status: usarAlterarStatus(),
        excluir: usarExcluirPrestador(),
      }
      return () => h('div')
    },
  })
  const consultas = criarClienteDeTeste()
  mount(Teste, { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } })
  return { expostos: () => expostos, consultas }
}

const CORPO = {
  nome: 'Pedro Lima',
  documento: '529.982.247-25',
  telefone: '(11) 91234-5678',
  email: '',
  regiao: '',
  especialidades: [],
}

describe('dados de prestadores', () => {
  let simulada: ReturnType<typeof simularApi>
  let respostaStatus: () => Promise<RespostaFalsa> | RespostaFalsa
  beforeEach(() => {
    respostaStatus = () => ({ data: prestador({ status: 'inativo' }) })
    simulada = simularApi(api, {
      'GET /api/prestadores/cadastro': SEED_PRESTADORES,
      'POST /api/prestadores': prestador({ id: 'p7', nome: 'Pedro Lima' }),
      'PATCH /api/prestadores/{id}': prestador(),
      'PATCH /api/prestadores/{id}/status': () => respostaStatus(),
      'DELETE /api/prestadores/{id}': { ok: true },
    })
  })

  it('carrega o cadastro', async () => {
    const { consultas } = montarComposables()
    await aguardar()
    expect(consultas.getQueryData(CHAVES_PRESTADORES.cadastro)).toEqual(SEED_PRESTADORES)
  })

  it('salvar sem id credencia (POST) e recarrega a lista', async () => {
    const { expostos } = montarComposables()
    await aguardar()
    await expostos().salvar.mutateAsync({ id: null, corpo: CORPO })
    await aguardar()
    expect(simulada.chamadas('POST', '/api/prestadores')[0]).toMatchObject({ body: CORPO })
    expect(simulada.chamadas('GET', '/api/prestadores/cadastro')).toHaveLength(2)
  })

  it('salvar com id edita (PATCH) o prestador', async () => {
    const { expostos } = montarComposables()
    await aguardar()
    await expostos().salvar.mutateAsync({ id: 'p1', corpo: CORPO })
    expect(simulada.chamadas('PATCH', '/api/prestadores/{id}')[0]).toMatchObject({
      params: { path: { id: 'p1' } },
      body: CORPO,
    })
  })

  it('o switch muda a lista na hora, antes da resposta da API', async () => {
    let responder!: (r: RespostaFalsa) => void
    respostaStatus = () => new Promise((pronto) => (responder = pronto))
    const { expostos, consultas } = montarComposables()
    await aguardar()
    const pedido = expostos().status.mutateAsync({ id: 'p1', status: 'inativo' })
    await aguardar()
    const lista = consultas.getQueryData<PrestadorCadastro[]>(CHAVES_PRESTADORES.cadastro)!
    expect(lista.find((p) => p.id === 'p1')!.status).toBe('inativo')
    expect(simulada.chamadas('PATCH', '/api/prestadores/{id}/status')[0]).toMatchObject({
      params: { path: { id: 'p1' } },
      body: { status: 'inativo' },
    })
    responder({ data: prestador({ status: 'inativo' }) })
    await pedido
  })

  it('o switch volta ao que era se a API recusar', async () => {
    respostaStatus = () => erroApi(404, 'nao_encontrado', 'Prestador não encontrado')
    const { expostos, consultas } = montarComposables()
    await aguardar()
    await expect(expostos().status.mutateAsync({ id: 'p1', status: 'inativo' })).rejects.toThrow(
      'Prestador não encontrado',
    )
    const lista = consultas.getQueryData<PrestadorCadastro[]>(CHAVES_PRESTADORES.cadastro)!
    expect(lista.find((p) => p.id === 'p1')!.status).toBe('ativo')
  })

  it('excluir chama o DELETE e recarrega a lista', async () => {
    const { expostos } = montarComposables()
    await aguardar()
    await expostos().excluir.mutateAsync('p6')
    await aguardar()
    expect(simulada.chamadas('DELETE', '/api/prestadores/{id}')[0]).toMatchObject({
      params: { path: { id: 'p6' } },
    })
    expect(simulada.chamadas('GET', '/api/prestadores/cadastro')).toHaveLength(2)
  })
})

describe('estado da tela', () => {
  it('busca e filtro voltam ao padrão ao reiniciar', () => {
    estadoPrestadores.busca = 'ana'
    estadoPrestadores.filtro = 'inativo'
    reiniciarPrestadores()
    expect({ ...estadoPrestadores }).toEqual({ busca: '', filtro: 'todos' })
  })

  it('e quando muda o usuário da sessão', async () => {
    const { sessao } = (await import('../sessao')) as unknown as {
      sessao: { usuario: { id: string } | null }
    }
    estadoPrestadores.busca = 'ana'
    sessao.usuario = null
    await nextTick()
    expect(estadoPrestadores.busca).toBe('')
    sessao.usuario = reactive({ id: 'u-renata' })
  })
})

describe('planilha (encaixe da etapa 2)', () => {
  it('a escolha do arquivo abre a importação com ele', () => {
    const arquivo = new File(['a'], 'credenciados.csv', { type: 'text/csv' })
    importacao.abrir(arquivo)
    expect(importacao.arquivo.value).toBe(arquivo)
    importacao.fechar()
    expect(importacao.arquivo.value).toBeNull()
  })

  it('exportar e baixar o modelo ainda não fazem nada (etapa 2)', async () => {
    await expect(exportarPlanilha()).resolves.toBeUndefined()
    await expect(baixarModeloPlanilha()).resolves.toBeUndefined()
  })
})

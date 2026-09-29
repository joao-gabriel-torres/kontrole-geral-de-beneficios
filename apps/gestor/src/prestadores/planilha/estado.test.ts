import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import {
  erroApi,
  simularApi,
  type OpcoesChamada,
  type RespostaFalsa,
} from '../../../test/api-falsa'
import { aguardar, criarClienteDeTeste } from '../../../test/montar'
import { api } from '../../api'
import { sessao as sessaoReal } from '../../sessao'
import { toastGestor } from '../../toast'
import { importacao, usarImportarPlanilha, type PreviaPlanilha } from './estado'

const { sessaoFalsa } = vi.hoisted(() => ({ sessaoFalsa: { usuario: { id: 'u-renata' } } }))
vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../../sessao', async () => {
  const { reactive: reativo } = await import('vue')
  return { sessao: reativo(sessaoFalsa), sair: vi.fn() }
})

const PREVIA: PreviaPlanilha = {
  linhas: [
    {
      nome: 'Pedro Lima',
      documento: '529.982.247-25',
      especialidades: ['Vazamento'],
      acao: 'novo',
      selo: 'Novo',
    },
  ],
  resumo: { novos: 1, atualizados: 0, erros: 0 },
  ausentes: [{ id: 'p1', nome: 'Carlos Mendes' }],
}

type ComSerializador = OpcoesChamada & { bodySerializer: () => FormData }
/** A sessão simulada, que o teste pode trocar. */
const sessao = sessaoReal as unknown as { usuario: { id: string } | null }
const formularioDe = (opcoes: OpcoesChamada) => (opcoes as ComSerializador).bodySerializer()
const arquivo = (nome = 'credenciados.csv') => new File(['Nome\nPedro'], nome, { type: 'text/csv' })

describe('importacao (prévia da planilha)', () => {
  let simulada: ReturnType<typeof simularApi>
  let responderPrevia: (opcoes: OpcoesChamada) => RespostaFalsa | Promise<RespostaFalsa>

  beforeEach(() => {
    importacao.fechar()
    toastGestor.mensagem.value = null
    responderPrevia = () => ({ data: PREVIA })
    simulada = simularApi(api, {
      'POST /api/prestadores/planilha/previa': (o: OpcoesChamada) => responderPrevia(o),
      'POST /api/prestadores/planilha/importacao': { novos: 1, atualizados: 0, desativados: 1 },
      'GET /api/prestadores/cadastro': [],
    })
  })

  it('envia o arquivo no multipart e abre a conferência com a prévia', async () => {
    const escolhido = arquivo()
    await importacao.abrir(escolhido)
    const [chamada] = simulada.chamadas('POST', '/api/prestadores/planilha/previa')
    const enviado = formularioDe(chamada!).get('arquivo') as File
    expect(enviado.name).toBe('credenciados.csv')
    expect(await enviado.text()).toBe('Nome\nPedro')
    expect(importacao.arquivo.value).toBe(escolhido)
    expect(importacao.previa.value).toEqual(PREVIA)
    expect(importacao.desativarAusentes.value).toBe(false)
  })

  it('o switch dos ausentes começa desligado a cada arquivo', async () => {
    await importacao.abrir(arquivo())
    importacao.alternarDesativar()
    expect(importacao.desativarAusentes.value).toBe(true)
    await importacao.abrir(arquivo('outra.csv'))
    expect(importacao.desativarAusentes.value).toBe(false)
  })

  it('erro da prévia vira toast com a mensagem e não abre', async () => {
    responderPrevia = () => erroApi(422, 'planilha_vazia', 'Não encontramos linhas na planilha')
    await importacao.abrir(arquivo())
    expect(toastGestor.mensagem.value).toBe('Não encontramos linhas na planilha')
    expect(importacao.previa.value).toBeNull()
    expect(importacao.arquivo.value).toBeNull()
  })

  it('vale o último arquivo escolhido, mesmo que o primeiro responda depois', async () => {
    const respostas: ((r: RespostaFalsa) => void)[] = []
    responderPrevia = () => new Promise((pronto) => respostas.push(pronto))
    const primeiro = importacao.abrir(arquivo('primeira.csv'))
    const segundo = importacao.abrir(arquivo('segunda.csv'))
    respostas[1]!({ data: PREVIA })
    await segundo
    respostas[0]!(erroApi(422, 'planilha_ilegivel', 'Não foi possível ler o arquivo'))
    await primeiro
    expect(importacao.arquivo.value?.name).toBe('segunda.csv')
    expect(toastGestor.mensagem.value).toBeNull()
  })

  it('fechar durante a prévia descarta a resposta', async () => {
    let responder!: (r: RespostaFalsa) => void
    responderPrevia = () => new Promise((pronto) => (responder = pronto))
    const pedido = importacao.abrir(arquivo())
    importacao.fechar()
    responder({ data: PREVIA })
    await pedido
    expect(importacao.previa.value).toBeNull()
  })

  it('fecha quando muda o usuário da sessão', async () => {
    await importacao.abrir(arquivo())
    sessao.usuario = null
    await nextTick()
    expect(importacao.previa.value).toBeNull()
    sessao.usuario = reactive({ id: 'u-renata' })
  })
})

describe('usarImportarPlanilha', () => {
  function montarImportacao() {
    let importar!: ReturnType<typeof usarImportarPlanilha>
    const consultas = criarClienteDeTeste()
    mount(
      defineComponent({
        setup() {
          importar = usarImportarPlanilha()
          return () => h('div')
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: consultas }]] } },
    )
    return { importar: () => importar, consultas }
  }

  it('envia o arquivo com a opção de desativar e recarrega os prestadores', async () => {
    const simulada = simularApi(api, {
      'POST /api/prestadores/planilha/importacao': { novos: 1, atualizados: 0, desativados: 1 },
    })
    const { importar, consultas } = montarImportacao()
    const invalidar = vi.spyOn(consultas, 'invalidateQueries')
    const escolhido = arquivo()
    const resultado = await importar().mutateAsync({ arquivo: escolhido, desativarAusentes: true })
    expect(resultado).toEqual({ novos: 1, atualizados: 0, desativados: 1 })
    const formulario = formularioDe(
      simulada.chamadas('POST', '/api/prestadores/planilha/importacao')[0]!,
    )
    expect((formulario.get('arquivo') as File).name).toBe('credenciados.csv')
    expect(formulario.get('desativarAusentes')).toBe('true')
    await aguardar()
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['prestadores'] })
  })

  it('sem desativar, manda "false"', async () => {
    const simulada = simularApi(api, {
      'POST /api/prestadores/planilha/importacao': { novos: 1, atualizados: 0, desativados: 0 },
    })
    const { importar } = montarImportacao()
    await importar().mutateAsync({ arquivo: arquivo(), desativarAusentes: false })
    const [chamada] = simulada.chamadas('POST', '/api/prestadores/planilha/importacao')
    expect(formularioDe(chamada!).get('desativarAusentes')).toBe('false')
  })
})

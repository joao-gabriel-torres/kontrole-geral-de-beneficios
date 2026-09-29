import type { TipoDemanda } from '@kgb/api-client'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type OpcoesChamada } from '../../test/api-falsa'
import { TIPOS } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { api } from '../api'
import { toastGestor } from '../toast'
import PaginaChecklists from './PaginaChecklists.vue'
import { tipoSelecionado } from './selecao'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

/** Uma API em memória com as regras de gravação da de verdade (trim e etapas vazias). */
function servidorFalso(extra: Record<string, unknown> = {}) {
  let tipos: TipoDemanda[] = structuredClone(TIPOS)
  const achar = (o: OpcoesChamada) => tipos.find((t) => t.id === o.params?.path?.id)!
  return simularApi(api, {
    'GET /api/tipos': () => ({ data: structuredClone(tipos) }),
    'PATCH /api/tipos/{id}': (o: OpcoesChamada) => {
      const tipo = achar(o)
      const corpo = o.body as { nome?: string; checklist?: string[] }
      if (corpo.nome !== undefined) tipo.nome = corpo.nome.trim()
      if (corpo.checklist !== undefined) {
        tipo.checklist = corpo.checklist.map((e) => e.trim()).filter(Boolean)
      }
      return { data: structuredClone(tipo) }
    },
    'POST /api/tipos': (o: OpcoesChamada) => {
      const nome = (o.body as { nome: string }).nome.trim()
      const tipo = { id: `t${tipos.length + 10}`, nome, cor: '#0069BD', checklist: [] }
      tipos = [...tipos, tipo]
      return { data: structuredClone(tipo), status: 201 }
    },
    'DELETE /api/tipos/{id}': (o: OpcoesChamada) => {
      tipos = tipos.filter((t) => t.id !== o.params?.path?.id)
      return { data: { ok: true } }
    },
    ...extra,
  })
}

async function abrir() {
  const { tela } = await montar(PaginaChecklists, { rota: '/checklists' })
  return tela
}

type Tela = VueWrapper
const itens = (tela: Tela) => tela.findAll('.tipo').map((b) => b.element.textContent)
const selecionado = (tela: Tela) => tela.get('.tipo.selecionado').element.textContent
const botao = (tela: Tela, texto: string) => tela.findAll('button').find((b) => b.text() === texto)!
const campoNome = (tela: Tela) => tela.get<HTMLInputElement>('input.nome')
const etapas = (tela: Tela) =>
  tela.findAll<HTMLInputElement>('.etapa input').map((i) => i.element.value)
const novaEtapa = (tela: Tela) =>
  tela.get<HTMLInputElement>('input[placeholder="Nova etapa do checklist"]')
const novoTipo = (tela: Tela) => tela.get<HTMLInputElement>('input[placeholder="Novo tipo"]')
const enter = { key: 'Enter' }

describe('PaginaChecklists', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    tipoSelecionado.value = null
    toastGestor.mensagem.value = ''
  })
  afterEach(() => vi.useRealTimers())

  it('mostra os tipos com "N itens" (no singular também), o primeiro selecionado e o checklist dele', async () => {
    servidorFalso()
    const tela = await abrir()
    expect(tela.get('h1').text()).toBe('Tipos de demanda')
    expect(tela.text()).toContain(
      'O checklist de cada tipo é copiado para o acionamento quando ele é criado.',
    )
    expect(itens(tela)).toEqual([
      'Vazamento 5 itens',
      'Revisão elétrica 2 itens',
      'Reparo em gesso 4 itens',
      'Vistoria 1 item',
    ])
    expect(selecionado(tela)).toBe('Vazamento 5 itens')
    expect(campoNome(tela).element.value).toBe('Vazamento')
    expect(tela.get('.rotulo').text()).toBe('Checklist · 5 itens')
    expect(etapas(tela)).toEqual(TIPOS[0]!.checklist)
    expect(tela.findAll('.numero').map((n) => n.text())).toEqual(['1', '2', '3', '4', '5'])
  })

  it('renomear: a lista acompanha na hora e o nome vai para a API 600 ms depois da última tecla', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await campoNome(tela).setValue(' Vazamento predial')
    expect(selecionado(tela)).toBe(' Vazamento predial 5 itens')
    await vi.advanceTimersByTimeAsync(300)
    await campoNome(tela).setValue(' Vazamento predial ')
    await vi.advanceTimersByTimeAsync(599)
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    await aguardar()
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toEqual([
      { params: { path: { id: 't1' } }, body: { nome: ' Vazamento predial ' } },
    ])
    // Enquanto o campo tem o foco, o que foi digitado fica; ao sair, vale o salvo (com trim).
    expect(campoNome(tela).element.value).toBe(' Vazamento predial ')
    await campoNome(tela).trigger('blur')
    expect(campoNome(tela).element.value).toBe('Vazamento predial')
    expect(selecionado(tela)).toBe('Vazamento predial 5 itens')
  })

  it('nome vazio não é enviado e volta ao último salvo ao sair do campo', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await campoNome(tela).setValue('')
    expect(selecionado(tela)).toBe(' 5 itens')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toHaveLength(0)
    await campoNome(tela).trigger('blur')
    expect(campoNome(tela).element.value).toBe('Vazamento')
    expect(selecionado(tela)).toBe('Vazamento 5 itens')
  })

  it('o erro da API vira toast com a mensagem, e o nome volta ao salvo ao sair do campo', async () => {
    servidorFalso({
      'PATCH /api/tipos/{id}': () =>
        erroApi(409, 'nome_duplicado', 'Já existe um tipo com esse nome'),
    })
    const tela = await abrir()
    await campoNome(tela).setValue('vistoria')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Já existe um tipo com esse nome')
    expect(campoNome(tela).element.value).toBe('vistoria')
    await campoNome(tela).trigger('blur')
    expect(campoNome(tela).element.value).toBe('Vazamento')
  })

  it('editar uma etapa envia o checklist inteiro, e a pausa com espaço no fim não perde o espaço', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await tela.findAll('.etapa input')[1]!.setValue('Fechar o registro ')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    const esperado = [...TIPOS[0]!.checklist]
    esperado[1] = 'Fechar o registro '
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toEqual([
      { params: { path: { id: 't1' } }, body: { checklist: esperado } },
    ])
    expect(etapas(tela)[1]).toBe('Fechar o registro ')
  })

  it('"Subir" troca com a anterior; na primeira fica com opacidade .3, sem disabled, e não faz nada', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    const subir = tela.findAll('button[title="Subir"]')
    expect(subir[0]!.attributes('style')).toContain('opacity: 0.3')
    expect(subir[0]!.attributes('disabled')).toBeUndefined()
    expect(subir[1]!.attributes('style')).toContain('opacity: 1')
    await subir[0]!.trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toHaveLength(0)
    await tela.findAll('button[title="Subir"]')[2]!.trigger('click')
    const [a, b, c, d, e] = TIPOS[0]!.checklist
    expect(etapas(tela)).toEqual([a, c, b, d, e])
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toEqual([
      { params: { path: { id: 't1' } }, body: { checklist: [a, c, b, d, e] } },
    ])
  })

  it('"Remover" tira a etapa; sem etapas aparece "Nenhum item ainda."', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await botao(tela, 'Vistoria 1 item').trigger('click')
    expect(tela.find('.vazio').exists()).toBe(false)
    await tela.get('button[title="Remover"]').trigger('click')
    expect(tela.get('.vazio').text()).toBe('Nenhum item ainda.')
    expect(tela.get('.rotulo').text()).toBe('Checklist · 0 itens')
    expect(selecionado(tela)).toBe('Vistoria 0 itens')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    expect(api.chamadas('PATCH', '/api/tipos/{id}')).toEqual([
      { params: { path: { id: 't9' } }, body: { checklist: [] } },
    ])
  })

  it('"Adicionar etapa" (clique ou Enter) acrescenta com trim e limpa o campo; vazio não faz nada', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await botao(tela, 'Adicionar etapa').trigger('click')
    await novaEtapa(tela).setValue('   ')
    await botao(tela, 'Adicionar etapa').trigger('click')
    expect(etapas(tela)).toHaveLength(5)
    expect(novaEtapa(tela).element.value).toBe('   ')
    await novaEtapa(tela).setValue('  Conferir vedação  ')
    await botao(tela, 'Adicionar etapa').trigger('click')
    expect(novaEtapa(tela).element.value).toBe('')
    await novaEtapa(tela).setValue('Secar o piso')
    await novaEtapa(tela).trigger('keydown', enter)
    expect(etapas(tela).slice(-2)).toEqual(['Conferir vedação', 'Secar o piso'])
    expect(selecionado(tela)).toBe('Vazamento 7 itens')
    await vi.advanceTimersByTimeAsync(600)
    await aguardar()
    const envios = api.chamadas('PATCH', '/api/tipos/{id}')
    expect(envios).toHaveLength(1)
    expect(envios[0]!.body).toEqual({
      checklist: [...TIPOS[0]!.checklist, 'Conferir vedação', 'Secar o piso'],
    })
  })

  it('"Novo tipo" (clique ou Enter) cria, seleciona o novo e limpa o campo; vazio não chama a API', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await botao(tela, 'Adicionar').trigger('click')
    await novoTipo(tela).setValue('   ')
    await botao(tela, 'Adicionar').trigger('click')
    expect(api.chamadas('POST', '/api/tipos')).toHaveLength(0)
    await novoTipo(tela).setValue('  Jardinagem ')
    await botao(tela, 'Adicionar').trigger('click')
    await aguardar()
    expect(api.chamadas('POST', '/api/tipos')).toEqual([{ body: { nome: 'Jardinagem' } }])
    expect(novoTipo(tela).element.value).toBe('')
    expect(itens(tela).at(-1)).toBe('Jardinagem 0 itens')
    expect(selecionado(tela)).toBe('Jardinagem 0 itens')
    expect(campoNome(tela).element.value).toBe('Jardinagem')
    expect(tela.get('.vazio').text()).toBe('Nenhum item ainda.')
    await novoTipo(tela).setValue('Dedetização')
    await novoTipo(tela).trigger('keydown', enter)
    await aguardar()
    expect(selecionado(tela)).toBe('Dedetização 0 itens')
  })

  it('"Novo tipo" com nome repetido: toast com a mensagem da API e o texto fica no campo', async () => {
    servidorFalso({
      'POST /api/tipos': () => erroApi(409, 'nome_duplicado', 'Já existe um tipo com esse nome'),
    })
    const tela = await abrir()
    await novoTipo(tela).setValue('vistoria')
    await novoTipo(tela).trigger('keydown', enter)
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Já existe um tipo com esse nome')
    expect(novoTipo(tela).element.value).toBe('vistoria')
    expect(itens(tela)).toHaveLength(4)
  })

  it('"Excluir tipo" exclui sem confirmação e seleciona o primeiro da lista', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await botao(tela, 'Reparo em gesso 4 itens').trigger('click')
    await botao(tela, 'Excluir tipo').trigger('click')
    await aguardar()
    expect(api.chamadas('DELETE', '/api/tipos/{id}')).toEqual([{ params: { path: { id: 't6' } } }])
    expect(itens(tela)).toEqual([
      'Vazamento 5 itens',
      'Revisão elétrica 2 itens',
      'Vistoria 1 item',
    ])
    expect(selecionado(tela)).toBe('Vazamento 5 itens')
  })

  it('"Excluir tipo" recusado pela API vira toast e a lista fica como estava', async () => {
    servidorFalso({
      'DELETE /api/tipos/{id}': () =>
        erroApi(409, 'ultimo_tipo', 'Mantenha pelo menos um tipo de demanda'),
    })
    const tela = await abrir()
    await botao(tela, 'Excluir tipo').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Mantenha pelo menos um tipo de demanda')
    expect(itens(tela)).toHaveLength(4)
  })

  it('trocar de tipo (ou clicar no selecionado) limpa o rascunho "Nova etapa"', async () => {
    servidorFalso()
    const tela = await abrir()
    await novaEtapa(tela).setValue('rascunho')
    await botao(tela, 'Vazamento 5 itens').trigger('click')
    expect(novaEtapa(tela).element.value).toBe('')
    await novaEtapa(tela).setValue('outro rascunho')
    await botao(tela, 'Vistoria 1 item').trigger('click')
    expect(novaEtapa(tela).element.value).toBe('')
    expect(campoNome(tela).element.value).toBe('Vistoria')
  })

  it('a seleção fica ao sair e voltar para a tela', async () => {
    servidorFalso()
    const primeira = await abrir()
    await botao(primeira, 'Vistoria 1 item').trigger('click')
    primeira.unmount()
    const segunda = await abrir()
    expect(selecionado(segunda)).toBe('Vistoria 1 item')
  })

  it('ao sair da tela, o que esperava o debounce é salvo na hora', async () => {
    const api = servidorFalso()
    const tela = await abrir()
    await campoNome(tela).setValue('Vazamento predial')
    await tela.findAll('.etapa input')[0]!.setValue('Achar o vazamento')
    tela.unmount()
    await aguardar()
    const envios = api.chamadas('PATCH', '/api/tipos/{id}').map((o) => o.body)
    expect(envios).toContainEqual({ nome: 'Vazamento predial' })
    expect(envios).toContainEqual({
      checklist: ['Achar o vazamento', ...TIPOS[0]!.checklist.slice(1)],
    })
  })

  it('carregando: só o cabeçalho, sem lista nem editor vazios', async () => {
    servidorFalso({ 'GET /api/tipos': () => new Promise(() => {}) })
    const tela = await abrir()
    expect(tela.get('h1').text()).toBe('Tipos de demanda')
    expect(tela.find('.lista').exists()).toBe(false)
    expect(tela.find('.editor').exists()).toBe(false)
    expect(tela.find('.estado').exists()).toBe(false)
  })

  it('erro ao carregar: a mensagem da API num cartão', async () => {
    servidorFalso({ 'GET /api/tipos': () => erroApi(500, 'interno', 'Erro interno') })
    const tela = await abrir()
    expect(tela.get('.estado').text()).toBe('Erro interno')
    expect(tela.find('.lista').exists()).toBe(false)
  })
})

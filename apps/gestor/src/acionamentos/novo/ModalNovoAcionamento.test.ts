import { dataISO } from '@kgb/ui'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type RespostaFalsa } from '../../../test/api-falsa'
import { PRESTADORES, resumo, TIPOS } from '../../../test/fixtures'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import { toastGestor } from '../../toast'
import { estadoLista } from '../estadoLista'
import ModalNovoAcionamento from './ModalNovoAcionamento.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('ModalNovoAcionamento', () => {
  let simulada: ReturnType<typeof simularApi>
  let criar: () => RespostaFalsa | Promise<RespostaFalsa>
  beforeEach(() => {
    toastGestor.mensagem.value = null
    criar = () => ({
      data: resumo({ id: 'a2000', prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' } }),
    })
    simulada = simularApi(api, {
      'GET /api/tipos': TIPOS,
      'GET /api/prestadores': PRESTADORES,
      'GET /api/acionamentos': [],
      'GET /api/acionamentos/contagem': {},
      'POST /api/acionamentos': () => criar(),
    })
  })

  const abrir = () => montar(ModalNovoAcionamento, { rota: '/painel' })
  const tipo = (tela: Awaited<ReturnType<typeof abrir>>['tela'], nome: string) =>
    tela.findAll('button.tipo').find((b) => b.text() === nome)!
  async function preencher(tela: Awaited<ReturnType<typeof abrir>>['tela']) {
    const [titulo, cliente, endereco] = tela.findAll('input:not([type])')
    await titulo!.setValue('  Vazamento no banheiro social ')
    await cliente!.setValue('Edifício Aurora')
    await endereco!.setValue('Rua Harmonia, 410 · Vila Madalena')
    await tipo(tela, 'Vazamento').trigger('click')
  }

  it('é um diálogo com o título do protótipo', async () => {
    const { tela } = await abrir()
    expect(tela.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(tela.find('#novo-titulo').text()).toBe('Novo acionamento')
  })

  it('abre com hoje, 09:00–11:00 e o Carlos escolhido entre os ativos', async () => {
    const { tela } = await abrir()
    expect((tela.find('input[type="date"]').element as HTMLInputElement).value).toBe(
      dataISO(new Date()),
    )
    const [inicio, fim] = tela.findAll('input[type="time"]')
    expect([
      (inicio!.element as HTMLInputElement).value,
      (fim!.element as HTMLInputElement).value,
    ]).toEqual(['09:00', '11:00'])
    expect((tela.find('select').element as HTMLSelectElement).value).toBe('p1')
    expect(tela.findAll('option').map((o) => o.text())).toEqual([
      'Ana Ribeiro · Zona Sul',
      'Carlos Mendes · Zona Oeste',
      'Pedro Lima',
    ])
  })

  it('"Enviar ao prestador" fica desabilitado até o formulário ficar válido', async () => {
    const { tela } = await abrir()
    const enviar = () => tela.find('button.enviar')
    expect(enviar().attributes('aria-disabled')).toBe('true')
    expect(enviar().classes()).toContain('inativo')
    await enviar().trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(0)
    await preencher(tela)
    expect(enviar().attributes('aria-disabled')).toBe('false')
    expect(enviar().classes()).not.toContain('inativo')
    await tela.findAll('input[type="time"]')[1]!.setValue('08:00')
    expect(enviar().attributes('aria-disabled')).toBe('true')
  })

  it('mostra o checklist gerado na ordem em que os tipos são escolhidos', async () => {
    const { tela } = await abrir()
    expect(tela.find('.previa-contagem').text()).toBe('0 itens no checklist')
    expect(tela.find('.previa-vazia').text()).toBe(
      'Escolha um ou mais tipos de demanda para montar o checklist.',
    )
    await tipo(tela, 'Vazamento').trigger('click')
    await tipo(tela, 'Reparo em gesso').trigger('click')
    expect(tipo(tela, 'Vazamento').classes()).toContain('escolhido')
    expect(tipo(tela, 'Vazamento').attributes('aria-pressed')).toBe('true')
    expect(tela.findAll('.previa-nome').map((n) => n.text())).toEqual([
      'Vazamento',
      'Reparo em gesso',
    ])
    expect(tela.find('.previa-contagem').text()).toBe('9 itens no checklist')
    expect(tela.findAll('.previa-etapa')[0]!.text()).toBe('1Localizar ponto do vazamento')
    expect(tela.find('.previa-vazia').exists()).toBe(false)
  })

  it('cria, avisa, fecha e volta para a lista em "Todos"', async () => {
    estadoLista.filtro = 'reprovado'
    estadoLista.busca = 'aurora'
    const { tela, router } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toEqual({
      titulo: 'Vazamento no banheiro social',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      data: dataISO(new Date()),
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
    expect(toastGestor.mensagem.value).toBe('Acionamento enviado para Carlos Mendes')
    expect(tela.emitted('fechar')).toHaveLength(1)
    expect(router.currentRoute.value.name).toBe('acionamentos')
    expect({ ...estadoLista }).toEqual({ filtro: 'todos', busca: '' })
  })

  it('dois cliques em enviar criam um acionamento só', async () => {
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(1)
  })

  it('erro da API: mostra a mensagem e mantém o modal aberto', async () => {
    criar = () => erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo')
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escolha um prestador ativo')
    expect(tela.emitted('fechar')).toBeUndefined()
  })

  /** Resposta do POST que só chega quando o teste chama `responder`. */
  function adiado() {
    let responder!: (r: RespostaFalsa) => void
    const promessa = new Promise<RespostaFalsa>((ok) => (responder = ok))
    return { promessa, responder }
  }
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

  it('em repouso, X e Cancelar não estão travados e o envio não está ocupado', async () => {
    const { tela } = await abrir()
    await preencher(tela)
    expect(tela.find('button.fechar').attributes('aria-disabled')).toBeUndefined()
    expect(tela.find('button.cancelar').attributes('aria-disabled')).toBeUndefined()
    expect(tela.find('button.enviar').attributes('aria-busy')).toBeUndefined()
    expect(tela.find('button.enviar').text()).toBe('Enviar ao prestador')
  })

  it('durante o envio, X, Cancelar e Esc não fecham e o botão mostra "Enviando…"', async () => {
    const pedido = adiado()
    criar = () => pedido.promessa
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    const enviar = tela.find('button.enviar')
    expect(enviar.text()).toBe('Enviando…')
    expect(enviar.attributes('aria-busy')).toBe('true')
    expect(enviar.attributes('aria-disabled')).toBe('true')
    expect(enviar.classes()).toContain('inativo')
    expect(tela.find('button.fechar').attributes('aria-disabled')).toBe('true')
    expect(tela.find('button.cancelar').attributes('aria-disabled')).toBe('true')
    await tela.find('button.fechar').trigger('click')
    await tela.find('button.cancelar').trigger('click')
    esc()
    expect(tela.emitted('fechar')).toBeUndefined()

    pedido.responder({ data: resumo({ id: 'a2000' }) })
    await aguardar()
    expect(tela.emitted('fechar')).toHaveLength(1)
    expect(toastGestor.mensagem.value).toBe('Acionamento enviado para Carlos Mendes')
  })

  it('se o envio falha, destrava X, Cancelar e Esc e mantém o formulário preenchido', async () => {
    const pedido = adiado()
    criar = () => pedido.promessa
    const { tela } = await abrir()
    await preencher(tela)
    await tela.find('button.enviar').trigger('click')
    await aguardar()
    pedido.responder(erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo'))
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escolha um prestador ativo')
    const enviar = tela.find('button.enviar')
    expect(enviar.text()).toBe('Enviar ao prestador')
    expect(enviar.attributes('aria-busy')).toBeUndefined()
    expect(enviar.classes()).not.toContain('inativo')
    expect(tela.find('button.fechar').attributes('aria-disabled')).toBeUndefined()
    const titulo = tela.findAll('input:not([type])')[0]!.element as HTMLInputElement
    expect(titulo.value).toBe('  Vazamento no banheiro social ')
    expect(tipo(tela, 'Vazamento').classes()).toContain('escolhido')
    esc()
    await tela.find('button.cancelar').trigger('click')
    await tela.find('button.fechar').trigger('click')
    expect(tela.emitted('fechar')).toHaveLength(3)
  })

  it('fecha pelo X, por Cancelar e pela tecla Esc', async () => {
    const { tela } = await abrir()
    await tela.find('button.fechar').trigger('click')
    await tela.find('button.cancelar').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tela.emitted('fechar')).toHaveLength(3)
  })

  it('ao fechar, devolve o foco para quem abriu o modal', async () => {
    const gatilho = document.createElement('button')
    document.body.appendChild(gatilho)
    gatilho.focus()
    const { tela } = await montar(ModalNovoAcionamento, { rota: '/painel', anexar: true })
    expect(document.activeElement).toBe(tela.find('[role="dialog"]').element)
    tela.unmount()
    expect(document.activeElement).toBe(gatilho)
    gatilho.remove()
  })
})

import { dataISO, urlMapa } from '@kgb/ui'
import type { VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  erroApi,
  simularApi,
  type OpcoesChamada,
  type RespostaFalsa,
} from '../../../test/api-falsa'
import { ASSINANTES, PRESTADORES, resumo, TIPOS } from '../../../test/fixtures'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import { MENSAGEM_FALHA } from '../../erros'
import { toastGestor } from '../../toast'
import { estadoLista } from '../estadoLista'
import ModalNovoAcionamento from './ModalNovoAcionamento.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

/** A API ordena pela distância numérica entre CEPs; sem CEP vai ao fim. */
const distancia = (cep: string | null, referencia: string) =>
  cep ? Math.abs(Number(cep) - Number(referencia)) : Number.POSITIVE_INFINITY
function prestadoresPorCep(o: OpcoesChamada): RespostaFalsa {
  const cep = o.params?.query?.cep as string | undefined
  if (!cep) return { data: PRESTADORES }
  return { data: [...PRESTADORES].sort((a, b) => distancia(a.cep, cep) - distancia(b.cep, cep)) }
}
/** Como a API: por nome, sem acentos e sem maiúsculas. */
const semAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
function buscarAssinantes(o: OpcoesChamada): RespostaFalsa {
  const termo = semAcentos(String(o.params?.query?.busca ?? ''))
  return { data: ASSINANTES.filter((a) => semAcentos(a.nome).includes(termo)) }
}
const ENDERECOS_CEP: Record<string, unknown> = {
  '01310200': {
    cep: '01310200',
    logradouro: 'Avenida Paulista',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
  },
}
function consultarCep(o: OpcoesChamada): RespostaFalsa {
  const endereco = ENDERECOS_CEP[o.params?.path?.cep ?? '']
  return endereco ? { data: endereco } : erroApi(404, 'cep_nao_encontrado', 'CEP não encontrado')
}

type Tela = VueWrapper

// Tipos
const campoTipos = (tela: Tela) => tela.get<HTMLInputElement>('#novo-busca-tipos')
const listaTipos = (tela: Tela) => tela.get('#novo-busca-tipos-lista')
const opcoesTipos = (tela: Tela) => tela.findAll('#novo-busca-tipos-lista button.opcao')
const opcaoTipo = (tela: Tela, nome: string) => opcoesTipos(tela).find((b) => b.text() === nome)!
const chips = (tela: Tela) => tela.findAll('.chip').map((c) => c.text())
/** Clique de mouse de verdade (detail 1); o `trigger` do test-utils manda detail 0, como o teclado. */
async function clicarComMouse(alvo: { element: Element }) {
  alvo.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
  await nextTick()
}
async function escolherTipo(tela: Tela, nome: string) {
  await campoTipos(tela).trigger('click')
  await clicarComMouse(opcaoTipo(tela, nome))
}

// Cliente e prestador (listbox)
const campo = (tela: Tela, id: string) => tela.get<HTMLInputElement>(`#${id}`)
const opcoes = (tela: Tela, id: string) => tela.findAll(`#${id}-lista [role="option"]`)
const titulos = (tela: Tela, id: string) => opcoes(tela, id).map((o) => o.get('.titulo').text())
async function escolherCliente(tela: Tela, nome: string) {
  await campo(tela, 'novo-cliente').trigger('click')
  await opcoes(tela, 'novo-cliente')
    .find((o) => o.get('.titulo').text() === nome)!
    .trigger('click')
  await aguardar()
}

async function preencher(tela: Tela) {
  await tela
    .get('input[placeholder="Ex.: Vazamento no banheiro social"]')
    .setValue('  Vazamento no banheiro social ')
  await escolherTipo(tela, 'Vazamento')
  await escolherCliente(tela, 'Edifício Aurora')
}

const tecla = (key: string) => ({ key })
const foco = () => document.activeElement?.textContent?.trim()
/** A busca de clientes espera 250 ms depois da última tecla. */
const esperarBusca = async () => {
  await new Promise((pronto) => setTimeout(pronto, 260))
  await aguardar()
}

describe('ModalNovoAcionamento', () => {
  let simulada: ReturnType<typeof simularApi>
  let criar: () => RespostaFalsa | Promise<RespostaFalsa>
  const rotas = () => ({
    'GET /api/tipos': TIPOS,
    'GET /api/prestadores': prestadoresPorCep,
    'GET /api/assinantes': buscarAssinantes,
    'GET /api/cep/{cep}': consultarCep,
    'GET /api/acionamentos': [],
    'GET /api/acionamentos/contagem': {},
    'POST /api/acionamentos': () => criar(),
  })
  beforeEach(() => {
    toastGestor.mensagem.value = null
    criar = () => ({
      data: resumo({ id: 'a2000', prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' } }),
    })
    simulada = simularApi(api, rotas())
  })

  const abrir = (anexar = false) => montar(ModalNovoAcionamento, { rota: '/painel', anexar })

  it('é um diálogo com o título do protótipo', async () => {
    const { tela } = await abrir()
    expect(tela.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(tela.get('#novo-titulo').text()).toBe('Novo acionamento')
  })

  it('abre com hoje, 09:00–11:00 e o Carlos escolhido entre os ativos', async () => {
    const { tela } = await abrir()
    expect(tela.get<HTMLInputElement>('input[type="date"]').element.value).toBe(dataISO(new Date()))
    const [inicio, fim] = tela.findAll<HTMLInputElement>('input[type="time"]')
    expect([inicio!.element.value, fim!.element.value]).toEqual(['09:00', '11:00'])
    expect(campo(tela, 'novo-prestador').element.value).toBe('Carlos Mendes · Zona Oeste')
    await campo(tela, 'novo-prestador').trigger('click')
    expect(titulos(tela, 'novo-prestador')).toEqual(['Ana Ribeiro', 'Carlos Mendes', 'Pedro Lima'])
    expect(opcoes(tela, 'novo-prestador')[1]!.attributes('aria-selected')).toBe('true')
    // Sem CEP ainda, a lista vem na ordem do cadastro, sem "mais próximo".
    expect(simulada.chamadas('GET', '/api/prestadores')[0]!.params?.query).toEqual({
      status: 'ativo',
      cep: undefined,
    })
    expect(tela.text()).not.toContain('mais próximo')
  })

  it('"Enviar ao prestador" fica desabilitado até o formulário ficar válido', async () => {
    const { tela } = await abrir()
    const enviar = () => tela.get('button.enviar')
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

  describe('busca de tipos', () => {
    it('abre a lista agrupada por categoria e filtra por tipo ou categoria, sem acentos', async () => {
      const { tela } = await abrir()
      const entrada = campoTipos(tela)
      expect(entrada.attributes('role')).toBe('combobox')
      expect(entrada.attributes('aria-expanded')).toBe('false')
      expect(entrada.attributes('aria-controls')).toBe('novo-busca-tipos-lista')
      await entrada.trigger('click')
      expect(entrada.attributes('aria-expanded')).toBe('true')
      expect(listaTipos(tela).isVisible()).toBe(true)
      expect(tela.findAll('.grupo').map((g) => g.text())).toEqual([
        'Acabamento',
        'Elétrica',
        'Hidráulica',
        'Outros',
      ])
      expect(opcoesTipos(tela).map((b) => b.text())).toEqual([
        'Reparo em gesso',
        'Revisão elétrica',
        'Vazamento',
        'Vistoria',
      ])
      await entrada.setValue('ELETRICA')
      expect(opcoesTipos(tela).map((b) => b.text())).toEqual(['Revisão elétrica'])
      await entrada.setValue('hidraul')
      expect(opcoesTipos(tela).map((b) => b.text())).toEqual(['Vazamento'])
      await entrada.setValue('jardim')
      expect(opcoesTipos(tela)).toHaveLength(0)
      expect(listaTipos(tela).text()).toBe('Nenhum tipo encontrado')
    })

    it('escolher vira chip removível, e a prévia segue a ordem de escolha', async () => {
      const { tela } = await abrir()
      expect(tela.get('.previa-contagem').text()).toBe('0 itens no checklist')
      expect(tela.get('.previa-vazia').text()).toBe(
        'Escolha um ou mais tipos de demanda para montar o checklist.',
      )
      await escolherTipo(tela, 'Vazamento')
      await tela.get('#novo-busca-tipos').setValue('gesso')
      await clicarComMouse(opcaoTipo(tela, 'Reparo em gesso'))
      // O clique limpa a busca e a lista continua aberta para escolher mais.
      expect(campoTipos(tela).element.value).toBe('')
      expect(listaTipos(tela).isVisible()).toBe(true)
      expect(opcaoTipo(tela, 'Vazamento').attributes('aria-pressed')).toBe('true')
      expect(opcaoTipo(tela, 'Vistoria').attributes('aria-pressed')).toBe('false')
      expect(chips(tela)).toEqual(['Vazamento', 'Reparo em gesso'])
      expect(tela.findAll('.previa-nome').map((n) => n.text())).toEqual([
        'Vazamento',
        'Reparo em gesso',
      ])
      expect(tela.get('.previa-contagem').text()).toBe('9 itens no checklist')
      expect(tela.findAll('.previa-etapa')[0]!.text()).toBe('1Localizar ponto do vazamento')
      expect(tela.find('.previa-vazia').exists()).toBe(false)

      await tela.get('button[aria-label="Remover Vazamento"]').trigger('click')
      expect(chips(tela)).toEqual(['Reparo em gesso'])
      expect(tela.findAll('.previa-nome').map((n) => n.text())).toEqual(['Reparo em gesso'])
    })

    it('teclado: ↓/↑ andam pela lista, Enter liga o tipo e Esc fecha só a lista', async () => {
      const { tela } = await abrir(true)
      const entrada = campoTipos(tela)
      entrada.element.focus()
      await entrada.trigger('keydown', tecla('ArrowDown'))
      await aguardar()
      expect(foco()).toBe('Reparo em gesso')
      await tela.get('button.opcao:focus').trigger('keydown', tecla('ArrowDown'))
      expect(foco()).toBe('Revisão elétrica')
      await tela.get('button.opcao:focus').trigger('keydown', tecla('Enter'))
      expect(chips(tela)).toEqual(['Revisão elétrica'])
      await tela.get('button.opcao:focus').trigger('keydown', tecla('ArrowUp'))
      await tela.get('button.opcao:focus').trigger('keydown', tecla('ArrowUp'))
      expect(document.activeElement).toBe(entrada.element)

      // Com a busca digitada, Enter no campo liga o primeiro encontrado.
      await entrada.setValue('vaz')
      await entrada.trigger('keydown', tecla('Enter'))
      expect(chips(tela)).toEqual(['Revisão elétrica', 'Vazamento'])
      expect(entrada.element.value).toBe('')

      await entrada.trigger('keydown', tecla('ArrowDown'))
      await aguardar()
      await tela.get('button.opcao:focus').trigger('keydown', tecla('Escape'))
      expect(listaTipos(tela).isVisible()).toBe(false)
      expect(document.activeElement).toBe(entrada.element)
      expect(tela.emitted('fechar')).toBeUndefined()
      // Com a lista fechada, o Esc volta a fechar o modal.
      await entrada.trigger('keydown', tecla('Escape'))
      expect(tela.emitted('fechar')).toHaveLength(1)
    })
  })

  describe('cliente', () => {
    it('busca os assinantes na API 250 ms depois da última tecla', async () => {
      const { tela } = await abrir()
      const entrada = campo(tela, 'novo-cliente')
      await entrada.trigger('click')
      expect(titulos(tela, 'novo-cliente')).toEqual(ASSINANTES.map((a) => a.nome))
      await entrada.setValue('c')
      await entrada.setValue('cli')
      await aguardar()
      expect(
        simulada.chamadas('GET', '/api/assinantes').map((c) => c.params?.query?.busca),
      ).toEqual([undefined])
      await esperarBusca()
      expect(
        simulada.chamadas('GET', '/api/assinantes').map((c) => c.params?.query?.busca),
      ).toEqual([undefined, 'cli'])
      expect(titulos(tela, 'novo-cliente')).toEqual(['Clínica Vida'])
      expect(opcoes(tela, 'novo-cliente')[0]!.get('.detalhe').text()).toBe(
        'Av. Paulista, 1578 · Bela Vista',
      )
      await entrada.setValue('xyz')
      await esperarBusca()
      expect(opcoes(tela, 'novo-cliente')).toHaveLength(0)
      expect(tela.get('.busca .vazio').text()).toBe('Nenhum assinante encontrado')
    })

    it('escolher pelo teclado preenche o endereço, o mapa e o prestador mais próximo', async () => {
      const { tela } = await abrir(true)
      const entrada = campo(tela, 'novo-cliente')
      expect(tela.find('a.mapa').exists()).toBe(false)
      expect(tela.get<HTMLInputElement>('#novo-endereco').element.readOnly).toBe(true)

      entrada.element.focus()
      await entrada.trigger('keydown', tecla('ArrowDown'))
      expect(entrada.attributes('aria-expanded')).toBe('true')
      expect(entrada.attributes('aria-controls')).toBe('novo-cliente-lista')
      expect(entrada.attributes('aria-activedescendant')).toBe('novo-cliente-opcao-0')
      await entrada.trigger('keydown', tecla('ArrowDown'))
      await entrada.trigger('keydown', tecla('ArrowUp'))
      expect(entrada.attributes('aria-activedescendant')).toBe('novo-cliente-opcao-0')
      expect(opcoes(tela, 'novo-cliente')[0]!.classes()).toContain('ativa')
      await entrada.trigger('keydown', tecla('Enter'))
      await aguardar()

      expect(entrada.element.value).toBe('Clínica Vida')
      expect(entrada.attributes('aria-expanded')).toBe('false')
      expect(tela.get<HTMLInputElement>('#novo-endereco').element.value).toBe(
        'Av. Paulista, 1578 · Bela Vista',
      )
      expect(tela.get('a.mapa').attributes('href')).toBe(urlMapa('Av. Paulista, 1578 · Bela Vista'))
      expect(tela.get('a.mapa').attributes('target')).toBe('_blank')
      // A lista de prestadores volta ordenada pelo CEP do assinante, com o mais próximo escolhido.
      expect(simulada.chamadas('GET', '/api/prestadores').at(-1)!.params?.query).toEqual({
        status: 'ativo',
        cep: '01310200',
      })
      expect(campo(tela, 'novo-prestador').element.value).toBe('Ana Ribeiro · Zona Sul')
      await campo(tela, 'novo-prestador').trigger('click')
      expect(titulos(tela, 'novo-prestador')).toEqual([
        'Ana Ribeiro',
        'Carlos Mendes',
        'Pedro Lima',
      ])
      expect(opcoes(tela, 'novo-prestador')[0]!.get('.detalhe').text()).toBe(
        'Zona Sul · mais próximo',
      )
    })

    it('a escolha da gestora vale até o CEP mudar', async () => {
      const { tela } = await abrir()
      await escolherCliente(tela, 'Clínica Vida')
      expect(campo(tela, 'novo-prestador').element.value).toBe('Ana Ribeiro · Zona Sul')
      await campo(tela, 'novo-prestador').trigger('click')
      await opcoes(tela, 'novo-prestador')[2]!.trigger('click')
      expect(campo(tela, 'novo-prestador').element.value).toBe('Pedro Lima')
      await escolherCliente(tela, 'Edifício Aurora')
      expect(campo(tela, 'novo-prestador').element.value).toBe('Carlos Mendes · Zona Oeste')
    })

    it('a escolha feita antes de chegar a lista do novo CEP não é trocada pelo mais próximo', async () => {
      let liberar!: () => void
      const espera = new Promise<void>((ok) => (liberar = ok))
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/prestadores': async (o: OpcoesChamada) => {
          if (o.params?.query?.cep) await espera
          return prestadoresPorCep(o)
        },
      })
      const { tela } = await abrir()
      await escolherCliente(tela, 'Clínica Vida')
      await campo(tela, 'novo-prestador').trigger('click')
      await opcoes(tela, 'novo-prestador')
        .find((o) => o.get('.titulo').text() === 'Pedro Lima')!
        .trigger('click')
      liberar()
      await aguardar()
      expect(campo(tela, 'novo-prestador').element.value).toBe('Pedro Lima')
    })

    it('Esc fecha só a lista, e o campo volta a mostrar o escolhido', async () => {
      const { tela } = await abrir(true)
      await escolherCliente(tela, 'Hotel Ipê')
      const entrada = campo(tela, 'novo-cliente')
      await entrada.setValue('aur')
      await entrada.trigger('keydown', tecla('Escape'))
      expect(entrada.attributes('aria-expanded')).toBe('false')
      expect(entrada.element.value).toBe('Hotel Ipê')
      expect(tela.emitted('fechar')).toBeUndefined()
    })
  })

  describe('outro endereço', () => {
    async function outroEndereco(tela: Tela) {
      await escolherCliente(tela, 'Edifício Aurora')
      await tela.get('.outro-endereco input[type="checkbox"]').setValue(true)
    }

    it('o CEP preenche rua, bairro e cidade; número e complemento são pedidos', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await outroEndereco(tela)
      expect(tela.find('#novo-endereco').exists()).toBe(false)
      expect(tela.find('a.mapa').exists()).toBe(false)
      const enviar = () => tela.get('button.enviar')
      expect(enviar().attributes('aria-disabled')).toBe('true')

      const cep = tela.get<HTMLInputElement>('#novo-cep')
      await cep.setValue('01310200')
      expect(cep.element.value).toBe('01310-200')
      await aguardar()
      expect(simulada.chamadas('GET', '/api/cep/{cep}')[0]!.params?.path).toEqual({
        cep: '01310200',
      })
      const rua = tela.get<HTMLInputElement>('.rua input')
      const bairro = tela.get<HTMLInputElement>('.bairro input')
      const cidade = tela.get<HTMLInputElement>('.cidade input')
      expect([rua.element.value, bairro.element.value, cidade.element.value]).toEqual([
        'Avenida Paulista',
        'Bela Vista',
        'São Paulo',
      ])
      expect([rua.element.readOnly, bairro.element.readOnly, cidade.element.readOnly]).toEqual([
        true,
        true,
        true,
      ])
      // O prestador mais próximo acompanha o CEP digitado.
      expect(campo(tela, 'novo-prestador').element.value).toBe('Ana Ribeiro · Zona Sul')
      expect(enviar().attributes('aria-disabled')).toBe('true')

      await tela.get('.casa input').setValue('1578')
      await tela.get('.complemento input').setValue('sala 3')
      expect(tela.get('a.mapa').attributes('href')).toBe(
        urlMapa('Avenida Paulista, 1578 · Bela Vista'),
      )
      expect(enviar().attributes('aria-disabled')).toBe('false')
      await enviar().trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        cliente: 'Edifício Aurora',
        endereco: 'Avenida Paulista, 1578, sala 3 · Bela Vista',
        assinanteId: 'a1',
        cep: '01310200',
        prestadorId: 'p2',
      })
    })

    it('CEP incompleto pede os 8 dígitos; CEP não encontrado deixa digitar rua e bairro', async () => {
      const { tela } = await abrir()
      await outroEndereco(tela)
      const cep = tela.get('#novo-cep')
      await cep.setValue('0131')
      expect(tela.find('.outro .falha').exists()).toBe(false)
      await cep.trigger('blur')
      expect(tela.get('.outro .falha').text()).toBe('Informe um CEP com 8 dígitos')
      expect(tela.get('.outro .falha').attributes('role')).toBe('alert')
      expect(cep.attributes('aria-invalid')).toBe('true')

      await cep.setValue('99999-999')
      await aguardar()
      expect(tela.get('.outro .falha').text()).toBe('CEP não encontrado')
      const rua = tela.get<HTMLInputElement>('.rua input')
      expect(rua.element.readOnly).toBe(false)
      expect(tela.get<HTMLInputElement>('.bairro input').element.readOnly).toBe(false)
      await rua.setValue('Rua Nova')
      await tela.get('.casa input').setValue('10')
      expect(tela.get('a.mapa').attributes('href')).toBe(urlMapa('Rua Nova, 10'))
    })

    it('desmarcar volta ao endereço do assinante', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await outroEndereco(tela)
      await tela.get('#novo-cep').setValue('01310200')
      await aguardar()
      await tela.get('.outro-endereco input[type="checkbox"]').setValue(false)
      expect(tela.get<HTMLInputElement>('#novo-endereco').element.value).toBe(
        'Rua Harmonia, 410 · Vila Madalena',
      )
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Harmonia, 410 · Vila Madalena',
        cep: '05433000',
      })
    })
  })

  it('prestador: busca por nome ou região, Enter escolhe e o POST leva o escolhido', async () => {
    const { tela } = await abrir()
    await preencher(tela)
    const entrada = campo(tela, 'novo-prestador')
    await entrada.trigger('click')
    await entrada.setValue('sul')
    expect(titulos(tela, 'novo-prestador')).toEqual(['Ana Ribeiro'])
    await entrada.trigger('keydown', tecla('Enter'))
    expect(entrada.element.value).toBe('Ana Ribeiro · Zona Sul')
    await entrada.trigger('click')
    await entrada.setValue('nada')
    expect(tela.get('.prestador .vazio').text()).toBe('Nenhum prestador encontrado')
    await entrada.trigger('blur')
    expect(entrada.element.value).toBe('Ana Ribeiro · Zona Sul')
    await tela.get('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
      prestadorId: 'p2',
    })
  })

  it('cria com o assinante e o CEP, avisa, fecha e volta para a lista em "Todos"', async () => {
    estadoLista.filtro = 'reprovado'
    estadoLista.busca = 'aurora'
    const { tela, router } = await abrir()
    await preencher(tela)
    await tela.get('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toEqual({
      titulo: 'Vazamento no banheiro social',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      assinanteId: 'a1',
      cep: '05433000',
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
    await tela.get('button.enviar').trigger('click')
    await tela.get('button.enviar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(1)
  })

  it('erro da API: mostra a mensagem e mantém o modal aberto', async () => {
    criar = () => erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo')
    const { tela } = await abrir()
    await preencher(tela)
    await tela.get('button.enviar').trigger('click')
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
    expect(tela.get('button.fechar').attributes('aria-disabled')).toBeUndefined()
    expect(tela.get('button.cancelar').attributes('aria-disabled')).toBeUndefined()
    expect(tela.get('button.enviar').attributes('aria-busy')).toBeUndefined()
    expect(tela.get('button.enviar').text()).toBe('Enviar ao prestador')
  })

  it('durante o envio, X, Cancelar e Esc não fecham e o botão mostra "Enviando…"', async () => {
    const pedido = adiado()
    criar = () => pedido.promessa
    const { tela } = await abrir()
    await preencher(tela)
    await tela.get('button.enviar').trigger('click')
    await aguardar()
    const enviar = tela.get('button.enviar')
    expect(enviar.text()).toBe('Enviando…')
    expect(enviar.attributes('aria-busy')).toBe('true')
    expect(enviar.attributes('aria-disabled')).toBe('true')
    expect(enviar.classes()).toContain('inativo')
    expect(tela.get('button.fechar').attributes('aria-disabled')).toBe('true')
    expect(tela.get('button.cancelar').attributes('aria-disabled')).toBe('true')
    await tela.get('button.fechar').trigger('click')
    await tela.get('button.cancelar').trigger('click')
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
    await tela.get('button.enviar').trigger('click')
    await aguardar()
    pedido.responder(erroApi(422, 'prestador_inativo', 'Escolha um prestador ativo'))
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escolha um prestador ativo')
    const enviar = tela.get('button.enviar')
    expect(enviar.text()).toBe('Enviar ao prestador')
    expect(enviar.attributes('aria-busy')).toBeUndefined()
    expect(enviar.classes()).not.toContain('inativo')
    expect(tela.get('button.fechar').attributes('aria-disabled')).toBeUndefined()
    const titulo = tela.get<HTMLInputElement>(
      'input[placeholder="Ex.: Vazamento no banheiro social"]',
    )
    expect(titulo.element.value).toBe('  Vazamento no banheiro social ')
    expect(chips(tela)).toEqual(['Vazamento'])
    expect(campo(tela, 'novo-cliente').element.value).toBe('Edifício Aurora')
    esc()
    await tela.get('button.cancelar').trigger('click')
    await tela.get('button.fechar').trigger('click')
    expect(tela.emitted('fechar')).toHaveLength(3)
  })

  describe('tipos ou prestadores que não carregam', () => {
    /** Rota que falha nas primeiras `falhas` chamadas e depois responde `dados`. */
    function falhandoAte(falhas: number, dados: unknown, falha: () => RespostaFalsa) {
      let chamadas = 0
      return () => (++chamadas <= falhas ? falha() : { data: dados })
    }
    const erroInterno = () => erroApi(500, 'interno', 'Erro interno')
    const semRede = (): RespostaFalsa => {
      throw new TypeError('Failed to fetch')
    }

    it('tipos: mostra a mensagem, e "Tentar de novo" busca e mostra os tipos', async () => {
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/tipos': falhandoAte(1, TIPOS, erroInterno),
      })
      const { tela } = await abrir()
      const falha = tela.get('.grupo-tipos .falha')
      expect(falha.attributes('role')).toBe('alert')
      expect(falha.text()).toContain('Erro interno')
      expect(tela.find('#novo-busca-tipos').exists()).toBe(false)
      await falha.get('button.tentar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('GET', '/api/tipos')).toHaveLength(2)
      expect(tela.find('.grupo-tipos .falha').exists()).toBe(false)
      await campoTipos(tela).trigger('click')
      expect(opcoesTipos(tela)).toHaveLength(TIPOS.length)
    })

    it('"Tentar de novo" que falha outra vez mantém a mensagem e o botão', async () => {
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/tipos': falhandoAte(2, TIPOS, semRede),
      })
      const { tela } = await abrir()
      await tela.get('.grupo-tipos .falha button.tentar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('GET', '/api/tipos')).toHaveLength(2)
      const falha = tela.get('.grupo-tipos .falha')
      expect(falha.text()).toContain(MENSAGEM_FALHA)
      expect(falha.get('button.tentar').text()).toBe('Tentar de novo')
    })

    it('prestadores: mensagem no lugar da busca, e o Carlos volta a ser o padrão depois', async () => {
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/prestadores': falhandoAte(1, PRESTADORES, semRede),
      })
      const { tela } = await abrir()
      expect(tela.find('#novo-prestador').exists()).toBe(false)
      const falha = tela.get('.prestador .falha')
      expect(falha.attributes('role')).toBe('alert')
      expect(falha.text()).toContain(MENSAGEM_FALHA)
      await falha.get('button.tentar').trigger('click')
      await aguardar()
      expect(tela.find('.prestador .falha').exists()).toBe(false)
      expect(campo(tela, 'novo-prestador').element.value).toBe('Carlos Mendes · Zona Oeste')
    })
  })

  it('fecha pelo X, por Cancelar e pela tecla Esc', async () => {
    const { tela } = await abrir()
    await tela.get('button.fechar').trigger('click')
    await tela.get('button.cancelar').trigger('click')
    esc()
    expect(tela.emitted('fechar')).toHaveLength(3)
  })

  it('ao fechar, devolve o foco para quem abriu o modal', async () => {
    const gatilho = document.createElement('button')
    document.body.appendChild(gatilho)
    gatilho.focus()
    const { tela } = await montar(ModalNovoAcionamento, { rota: '/painel', anexar: true })
    expect(document.activeElement).toBe(tela.get('[role="dialog"]').element)
    tela.unmount()
    expect(document.activeElement).toBe(gatilho)
    gatilho.remove()
  })
})

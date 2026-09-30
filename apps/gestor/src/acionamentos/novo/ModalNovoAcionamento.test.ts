import { ErroTempoEsgotado } from '@kgb/api-client'
import { dataISO } from '@kgb/ui'
import { DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  erroApi,
  simularApi,
  type OpcoesChamada,
  type RespostaFalsa,
} from '../../../test/api-falsa'
import { ASSINANTES, PRESTADORES, resumo, TIPOS } from '../../../test/fixtures'
import { leafletFalso } from '../../../test/leaflet-falso'
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
vi.mock('leaflet', () => import('../../../test/leaflet-falso'))

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
  '06010000': {
    cep: '06010000',
    logradouro: 'Rua Antônio Agú',
    bairro: 'Centro',
    cidade: 'Osasco',
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

/** A posição que a geocodificação falsa acha para qualquer endereço. */
const ACHADA = { latitude: -23.556789, longitude: -46.690123 }

// Mapa: o diálogo vai para #modais-gestor (no app, fica no layout) e é carregado sob demanda.
const dialogoMapa = () => document.querySelector<HTMLElement>('#modais-gestor [role="dialog"]')
async function abrirMapa(tela: Tela) {
  await tela.get('button.mapa').trigger('click')
  await vi.waitFor(() => expect(dialogoMapa()).not.toBeNull())
  await aguardar()
  return new DOMWrapper(dialogoMapa()!)
}
/** O endereço que o mapa procura (e mostra), fechando o mapa em seguida. */
async function enderecoNoMapa(tela: Tela) {
  const mapa = await abrirMapa(tela)
  const endereco = mapa.get('.endereco').text()
  expect(simulada.chamadas('GET', '/api/geocodificacao').at(-1)!.params?.query).toEqual({
    endereco,
  })
  await mapa.get('button.cancelar').trigger('click')
  await aguardar()
  return endereco
}
let simulada: ReturnType<typeof simularApi>

const tecla = (key: string) => ({ key })
const foco = () => document.activeElement?.textContent?.trim()
/** A busca de clientes espera 250 ms depois da última tecla. */
const esperarBusca = async () => {
  await new Promise((pronto) => setTimeout(pronto, 260))
  await aguardar()
}

/** O endereço que a consulta reversa acha para o pino movido (o nome do bairro é o do mapa). */
const ENDERECO_DO_PONTO = {
  cep: '01310200',
  logradouro: 'Avenida Paulista',
  numero: '1600',
  bairro: 'Jardim Paulista',
  cidade: 'São Paulo',
  uf: 'SP',
}

describe('ModalNovoAcionamento', () => {
  let criar: () => RespostaFalsa | Promise<RespostaFalsa>
  let reversa: (o: OpcoesChamada) => RespostaFalsa | Promise<RespostaFalsa>
  const rotas = () => ({
    'GET /api/tipos': TIPOS,
    'GET /api/prestadores': prestadoresPorCep,
    'GET /api/assinantes': buscarAssinantes,
    'GET /api/cep/{cep}': consultarCep,
    'GET /api/geocodificacao': ACHADA,
    'GET /api/geocodificacao/reversa': (o: OpcoesChamada) => reversa(o),
    'GET /api/acionamentos': [],
    'GET /api/acionamentos/contagem': {},
    'POST /api/acionamentos': () => criar(),
  })
  let destinoModais: HTMLElement
  beforeEach(() => {
    destinoModais = Object.assign(document.createElement('div'), { id: 'modais-gestor' })
    document.body.appendChild(destinoModais)
    leafletFalso.limpar()
    toastGestor.mensagem.value = null
    criar = () => ({
      data: resumo({ id: 'a2000', prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' } }),
    })
    reversa = () => ({ data: ENDERECO_DO_PONTO })
    simulada = simularApi(api, rotas())
  })
  afterEach(() => destinoModais.remove())

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

    it('Enter no campo prefere quem casa pelo nome a quem casa só pela categoria', async () => {
      const pontoDeLuz = { ...TIPOS[1]!, id: 't3', nome: 'Ponto de luz' }
      simulada = simularApi(api, { ...rotas(), 'GET /api/tipos': [...TIPOS, pontoDeLuz] })
      const { tela } = await abrir(true)
      const entrada = campoTipos(tela)
      entrada.element.focus()
      await entrada.trigger('click')
      await entrada.setValue('eletr')
      expect(opcoesTipos(tela).map((b) => b.text())).toEqual(['Ponto de luz', 'Revisão elétrica'])
      await entrada.trigger('keydown', tecla('Enter'))
      expect(chips(tela)).toEqual(['Revisão elétrica'])
      // Sem ninguém pelo nome, vale o primeiro da categoria.
      await entrada.setValue('hidraul')
      await entrada.trigger('keydown', tecla('Enter'))
      expect(chips(tela)).toEqual(['Revisão elétrica', 'Vazamento'])
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

    it('Enter não escolhe enquanto a lista não é a do texto digitado', async () => {
      let liberar!: () => void
      const espera = new Promise<void>((ok) => (liberar = ok))
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/assinantes': async (o: OpcoesChamada) => {
          if (o.params?.query?.busca) await espera
          return buscarAssinantes(o)
        },
      })
      const { tela } = await abrir(true)
      const entrada = campo(tela, 'novo-cliente')
      const endereco = () => tela.get<HTMLInputElement>('#novo-endereco').element.value
      entrada.element.focus()
      // Na espera de 250 ms, a lista em destaque ainda é a de antes (todos os assinantes).
      await entrada.setValue('hotel')
      expect(titulos(tela, 'novo-cliente')[0]).toBe('Clínica Vida')
      await entrada.trigger('keydown', tecla('Enter'))
      expect(entrada.attributes('aria-expanded')).toBe('true')
      expect(entrada.element.value).toBe('hotel')
      expect(endereco()).toBe('')
      // A busca saiu, mas a resposta não chegou: a lista mostrada continua a anterior.
      await esperarBusca()
      expect(simulada.chamadas('GET', '/api/assinantes').at(-1)!.params?.query?.busca).toBe('hotel')
      expect(titulos(tela, 'novo-cliente')[0]).toBe('Clínica Vida')
      await entrada.trigger('keydown', tecla('Enter'))
      expect(entrada.attributes('aria-expanded')).toBe('true')
      expect(endereco()).toBe('')
      // Com a lista do termo digitado, o Enter escolhe.
      liberar()
      await aguardar()
      expect(titulos(tela, 'novo-cliente')).toEqual(['Hotel Ipê'])
      await entrada.trigger('keydown', tecla('Enter'))
      expect(entrada.element.value).toBe('Hotel Ipê')
      expect(endereco()).toBe('Rua Frei Caneca, 569 · Consolação')
    })

    it('escolher pelo teclado preenche o endereço, o mapa e o prestador mais próximo', async () => {
      const { tela } = await abrir(true)
      const entrada = campo(tela, 'novo-cliente')
      expect(tela.find('.mapa').exists()).toBe(false)
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
      expect(tela.get('button.mapa').text()).toBe('Ver no mapa')
      expect(await enderecoNoMapa(tela)).toBe('Av. Paulista, 1578 · Bela Vista')
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

    it('assinante de outra cidade: o endereço mostrado e gravado leva a cidade', async () => {
      const deOsasco = {
        ...ASSINANTES[1]!,
        id: 'a9',
        nome: 'Condomínio Osasco',
        cep: '06010000',
        cidade: 'Osasco',
        endereco: 'Rua Antônio Agú, 12 · Centro',
      }
      simulada = simularApi(api, { ...rotas(), 'GET /api/assinantes': [deOsasco] })
      const { tela } = await abrir()
      await escolherCliente(tela, 'Condomínio Osasco')
      expect(tela.get<HTMLInputElement>('#novo-endereco').element.value).toBe(
        'Rua Antônio Agú, 12 · Centro · Osasco - SP',
      )
      expect(await enderecoNoMapa(tela)).toBe('Rua Antônio Agú, 12 · Centro · Osasco - SP')
      await tela.get('input[placeholder="Ex.: Vazamento no banheiro social"]').setValue('Vazamento')
      await escolherTipo(tela, 'Vazamento')
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Antônio Agú, 12 · Centro · Osasco - SP',
        cep: '06010000',
      })
    })

    it('sem nenhum prestador com CEP, a lista fica por nome: nada é trocado nem rotulado', async () => {
      // Como a API: sem CEP, todos vão ao fim, por nome.
      const semCep = PRESTADORES.map((p) => ({ ...p, cep: null })).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
      )
      simulada = simularApi(api, { ...rotas(), 'GET /api/prestadores': semCep })
      const { tela } = await abrir()
      await escolherCliente(tela, 'Clínica Vida')
      expect(simulada.chamadas('GET', '/api/prestadores').at(-1)!.params?.query).toEqual({
        status: 'ativo',
        cep: '01310200',
      })
      expect(campo(tela, 'novo-prestador').element.value).toBe('Carlos Mendes · Zona Oeste')
      await campo(tela, 'novo-prestador').trigger('click')
      expect(opcoes(tela, 'novo-prestador')[0]!.get('.detalhe').text()).toBe('Zona Sul')
      expect(tela.text()).not.toContain('mais próximo')
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
      expect(tela.find('.mapa').exists()).toBe(false)
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
      expect(await enderecoNoMapa(tela)).toBe('Avenida Paulista, 1578 · Bela Vista')
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

    it('CEP de outra cidade: o endereço gravado e o mapa terminam com "Cidade - UF"', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await outroEndereco(tela)
      await tela.get('#novo-cep').setValue('06010000')
      await aguardar()
      expect(tela.get<HTMLInputElement>('.cidade input').element.value).toBe('Osasco')
      await tela.get('.casa input').setValue('12')
      expect(await enderecoNoMapa(tela)).toBe('Rua Antônio Agú, 12 · Centro · Osasco - SP')
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Antônio Agú, 12 · Centro · Osasco - SP',
        cep: '06010000',
      })
    })

    it('CEP incompleto pede os 8 dígitos; CEP não encontrado bloqueia o envio', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await outroEndereco(tela)
      const rua = tela.get<HTMLInputElement>('.rua input')
      const bairro = tela.get<HTMLInputElement>('.bairro input')
      // Sem CEP, rua e bairro esperam a consulta.
      expect([rua.element.readOnly, bairro.element.readOnly]).toEqual([true, true])
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
      expect([rua.element.readOnly, bairro.element.readOnly]).toEqual([true, true])
      await tela.get('.casa input').setValue('10')
      const enviar = tela.get('button.enviar')
      expect(enviar.attributes('aria-disabled')).toBe('true')
      await enviar.trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')).toHaveLength(0)
    })

    it.each([
      [
        'o ViaCEP fora do ar (502)',
        () => erroApi(502, 'cep_indisponivel', 'O serviço de CEP não respondeu, tente de novo'),
      ],
      [
        'o tempo esgotado',
        (): RespostaFalsa => {
          throw new ErroTempoEsgotado()
        },
      ],
    ])('com %s, rua e bairro são digitados e o envio segue', async (_, falha) => {
      simulada = simularApi(api, { ...rotas(), 'GET /api/cep/{cep}': falha })
      const { tela } = await abrir()
      await preencher(tela)
      await outroEndereco(tela)
      await tela.get('#novo-cep').setValue('01310200')
      await aguardar()
      expect(tela.find('.outro .falha').exists()).toBe(true)
      const rua = tela.get<HTMLInputElement>('.rua input')
      const bairro = tela.get<HTMLInputElement>('.bairro input')
      expect([rua.element.readOnly, bairro.element.readOnly]).toEqual([false, false])
      await rua.setValue('Rua Nova')
      await bairro.setValue('Bela Vista')
      await tela.get('.casa input').setValue('10')
      expect(await enderecoNoMapa(tela)).toBe('Rua Nova, 10 · Bela Vista')
      const enviar = tela.get('button.enviar')
      expect(enviar.attributes('aria-disabled')).toBe('false')
      await enviar.trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Nova, 10 · Bela Vista',
        cep: '01310200',
      })
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

  describe('localização no mapa', () => {
    const botaoMapa = (tela: Tela) => tela.get('button.mapa')
    const conferida = (tela: Tela) => tela.find('.conferida')
    const ARRASTADA = { latitude: -23.557, longitude: -46.6905 }
    /** Abre o mapa e confirma o pino onde ele abriu (sem mover: confere o endereço em uso). */
    async function conferir(tela: Tela) {
      const mapa = await abrirMapa(tela)
      await mapa.get('button.confirmar').trigger('click')
      await aguardar()
    }

    it('"Ver no mapa" abre o mapa no endereço; confirmar sem mover mostra "Localização conferida" e o POST leva a posição', async () => {
      const { tela } = await abrir(true)
      await preencher(tela)
      const mapa = await abrirMapa(tela)
      expect(mapa.get('#mapa-titulo').text()).toBe('Conferir localização')
      expect(simulada.chamadas('GET', '/api/geocodificacao')[0]!.params?.query).toEqual({
        endereco: 'Rua Harmonia, 410 · Vila Madalena',
      })
      expect(leafletFalso.pino.getLatLng()).toEqual({
        lat: ACHADA.latitude,
        lng: ACHADA.longitude,
      })
      // Com o mapa aberto, o formulário por trás fica inerte.
      expect(tela.get('.sobreposicao').attributes('inert')).toBeDefined()
      await mapa.get('button.confirmar').trigger('click')
      await aguardar()

      expect(dialogoMapa()).toBeNull()
      expect(tela.get('.sobreposicao').attributes('inert')).toBeUndefined()
      expect(conferida(tela).text()).toBe('Localização conferida')
      expect(botaoMapa(tela).text()).toBe('Trocar')
      expect(botaoMapa(tela).attributes('aria-label')).toBe('Trocar a localização no mapa')
      expect(document.activeElement).toBe(botaoMapa(tela).element)
      // Sem mover o pino, o endereço continua o de cadastro: nada de consulta reversa.
      expect(simulada.chamadas('GET', '/api/geocodificacao/reversa')).toHaveLength(0)
      expect(tela.get<HTMLInputElement>('.outro-endereco input').element.checked).toBe(false)
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Harmonia, 410 · Vila Madalena',
        cep: '05433000',
        latitude: ACHADA.latitude,
        longitude: ACHADA.longitude,
      })
    })

    it('sem o endereço achado no mapa, levar o pino ao local confere o endereço de cadastro', async () => {
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/geocodificacao': () =>
          erroApi(404, 'localizacao_nao_encontrada', 'Não encontramos este endereço no mapa'),
      })
      const { tela } = await abrir()
      await preencher(tela)
      const mapa = await abrirMapa(tela)
      leafletFalso.pino.arrastarPara(ARRASTADA.latitude, ARRASTADA.longitude)
      await aguardar()
      await mapa.get('button.confirmar').trigger('click')
      await aguardar()
      expect(conferida(tela).exists()).toBe(true)
      expect(simulada.chamadas('GET', '/api/geocodificacao/reversa')).toHaveLength(0)
      expect(tela.get<HTMLInputElement>('#novo-endereco').element.value).toBe(
        'Rua Harmonia, 410 · Vila Madalena',
      )
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        endereco: 'Rua Harmonia, 410 · Vila Madalena',
        latitude: ARRASTADA.latitude,
      })
    })

    it('sem conferir, o POST não leva posição', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      expect(conferida(tela).exists()).toBe(false)
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      const corpo = simulada.chamadas('POST', '/api/acionamentos')[0]!.body
      expect(corpo).not.toHaveProperty('latitude')
      expect(corpo).not.toHaveProperty('longitude')
    })

    it('assinante com posição salva: o mapa abre nela, sem procurar o endereço', async () => {
      const salvo = { ...ASSINANTES[1]!, latitude: -23.5571, longitude: -46.6912 }
      simulada = simularApi(api, { ...rotas(), 'GET /api/assinantes': [salvo] })
      const { tela } = await abrir()
      await escolherCliente(tela, 'Edifício Aurora')
      await abrirMapa(tela)
      expect(simulada.chamadas('GET', '/api/geocodificacao')).toHaveLength(0)
      expect(leafletFalso.pino.getLatLng()).toEqual({ lat: -23.5571, lng: -46.6912 })
    })

    it('assinante com posição salva: o acionamento já nasce com a localização conferida', async () => {
      const salvo = { ...ASSINANTES[1]!, latitude: -23.5571, longitude: -46.6912 }
      simulada = simularApi(api, { ...rotas(), 'GET /api/assinantes': [salvo] })
      const { tela } = await abrir()
      await preencher(tela)
      expect(conferida(tela).text()).toBe('Localização conferida')
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).toMatchObject({
        latitude: -23.5571,
        longitude: -46.6912,
      })
    })

    it('reabrir abre na posição conferida, sem procurar o endereço de novo', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await conferir(tela)
      await abrirMapa(tela)
      expect(simulada.chamadas('GET', '/api/geocodificacao')).toHaveLength(1)
      expect(leafletFalso.pino.getLatLng()).toEqual({
        lat: ACHADA.latitude,
        lng: ACHADA.longitude,
      })
    })

    it('Cancelar e Esc fecham só o mapa, sem conferir, e devolvem o foco ao botão', async () => {
      const { tela } = await abrir(true)
      await preencher(tela)
      const mapa = await abrirMapa(tela)
      leafletFalso.pino.arrastarPara(ARRASTADA.latitude, ARRASTADA.longitude)
      await mapa.get('button.cancelar').trigger('click')
      await aguardar()
      expect(dialogoMapa()).toBeNull()
      expect(conferida(tela).exists()).toBe(false)
      // O pino movido e cancelado não muda o endereço.
      expect(simulada.chamadas('GET', '/api/geocodificacao/reversa')).toHaveLength(0)
      expect(tela.get<HTMLInputElement>('.outro-endereco input').element.checked).toBe(false)
      expect(document.activeElement).toBe(botaoMapa(tela).element)

      await abrirMapa(tela)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await aguardar()
      expect(dialogoMapa()).toBeNull()
      expect(tela.emitted('fechar')).toBeUndefined()
      expect(conferida(tela).exists()).toBe(false)
      // Com o mapa fechado, o Esc volta a fechar o Novo acionamento.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(tela.emitted('fechar')).toHaveLength(1)
    })

    it('trocar de cliente descarta a localização conferida', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await conferir(tela)
      expect(conferida(tela).exists()).toBe(true)
      await escolherCliente(tela, 'Hotel Ipê')
      expect(conferida(tela).exists()).toBe(false)
      expect(botaoMapa(tela).text()).toBe('Ver no mapa')
      await tela.get('button.enviar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/acionamentos')[0]!.body).not.toHaveProperty('latitude')
    })

    it('trocar o CEP do outro endereço (ou voltar ao do assinante) descarta a localização conferida', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await tela.get('.outro-endereco input[type="checkbox"]').setValue(true)
      await tela.get('#novo-cep').setValue('01310200')
      await aguardar()
      await tela.get('.casa input').setValue('1578')
      await conferir(tela)
      expect(conferida(tela).exists()).toBe(true)
      await tela.get('#novo-cep').setValue('06010000')
      await aguardar()
      expect(conferida(tela).exists()).toBe(false)

      await conferir(tela)
      expect(conferida(tela).exists()).toBe(true)
      await tela.get('.outro-endereco input[type="checkbox"]').setValue(false)
      expect(conferida(tela).exists()).toBe(false)
    })
  })

  describe('pino movido: outro endereço preenchido pelo ponto', () => {
    /** O Edifício Aurora arrastado uns quarteirões. */
    const MOVIDA = { latitude: -23.5612, longitude: -46.6559 }
    const AVISO_PONTO = 'Não achamos o endereço deste ponto: complete os campos'
    const conferida = (tela: Tela) => tela.find('.conferida')
    const marcado = (tela: Tela) =>
      tela.get<HTMLInputElement>('.outro-endereco input').element.checked
    const valor = (tela: Tela, seletor: string) => tela.get<HTMLInputElement>(seletor).element.value
    const campos = (tela: Tela) => ({
      cep: valor(tela, '#novo-cep'),
      rua: valor(tela, '.rua input'),
      numero: valor(tela, '.casa input'),
      complemento: valor(tela, '.complemento input'),
      bairro: valor(tela, '.bairro input'),
      cidade: valor(tela, '.cidade input'),
    })
    const editaveis = (tela: Tela) =>
      ['.rua input', '.bairro input'].map((s) => !tela.get<HTMLInputElement>(s).element.readOnly)
    const post = () => simulada.chamadas('POST', '/api/acionamentos')[0]!.body
    async function enviar(tela: Tela) {
      await tela.get('button.enviar').trigger('click')
      await aguardar()
    }
    /** Abre o mapa, leva o pino (arrastando) até a posição e confirma. */
    async function moverPino(tela: Tela, posicao = MOVIDA) {
      const mapa = await abrirMapa(tela)
      leafletFalso.pino.arrastarPara(posicao.latitude, posicao.longitude)
      await aguardar()
      await mapa.get('button.confirmar').trigger('click')
      await aguardar()
    }

    it('marca "Atender em outro endereço", consulta o ponto e o CEP completa rua, bairro e cidade', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(simulada.chamadas('GET', '/api/geocodificacao/reversa')[0]!.params?.query).toEqual({
        latitude: '-23.5612',
        longitude: '-46.6559',
      })
      expect(marcado(tela)).toBe(true)
      // O número vem do ponto; rua, bairro e cidade, do ViaCEP (o bairro do mapa perde).
      expect(campos(tela)).toEqual({
        cep: '01310-200',
        rua: 'Avenida Paulista',
        numero: '1600',
        complemento: '',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
      })
      expect(editaveis(tela)).toEqual([false, false])
      expect(conferida(tela).text()).toBe('Localização conferida')
      expect(tela.find('.aviso').exists()).toBe(false)
      // O prestador mais próximo acompanha o CEP do ponto.
      expect(campo(tela, 'novo-prestador').element.value).toBe('Ana Ribeiro · Zona Sul')
      await enviar(tela)
      expect(post()).toMatchObject({
        cliente: 'Edifício Aurora',
        assinanteId: 'a1',
        endereco: 'Avenida Paulista, 1600 · Bela Vista',
        cep: '01310200',
        latitude: MOVIDA.latitude,
        longitude: MOVIDA.longitude,
      })
    })

    it('sem CEP no ponto: rua e bairro do mapa, editáveis; completar o CEP e o número mantém a posição', async () => {
      reversa = () => ({
        data: {
          cep: null,
          logradouro: 'Rua Antônio Agú',
          numero: null,
          bairro: 'Centro',
          cidade: 'Osasco',
          uf: 'SP',
        },
      })
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(campos(tela)).toEqual({
        cep: '',
        rua: 'Rua Antônio Agú',
        numero: '',
        complemento: '',
        bairro: 'Centro',
        cidade: 'Osasco',
      })
      expect(editaveis(tela)).toEqual([true, true])
      // Sem o número, o endereço ainda não vai ao mapa, mas a posição do pino está conferida.
      expect(conferida(tela).exists()).toBe(true)
      expect(tela.get('button.mapa').text()).toBe('Trocar')

      await tela.get('.casa input').setValue('12')
      await tela.get('#novo-cep').setValue('06010000')
      await aguardar()
      expect(conferida(tela).exists()).toBe(true)
      await enviar(tela)
      expect(post()).toMatchObject({
        endereco: 'Rua Antônio Agú, 12 · Centro · Osasco - SP',
        cep: '06010000',
        latitude: MOVIDA.latitude,
        longitude: MOVIDA.longitude,
      })
    })

    it('com o ViaCEP fora, rua, bairro e cidade vêm do ponto, editáveis', async () => {
      simulada = simularApi(api, {
        ...rotas(),
        'GET /api/cep/{cep}': () =>
          erroApi(502, 'cep_indisponivel', 'O serviço de CEP não respondeu, tente de novo'),
      })
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(campos(tela)).toMatchObject({
        cep: '01310-200',
        rua: 'Avenida Paulista',
        numero: '1600',
        bairro: 'Jardim Paulista',
        cidade: 'São Paulo',
      })
      expect(editaveis(tela)).toEqual([true, true])
      await tela.get('.bairro input').setValue('Bela Vista')
      expect(conferida(tela).exists()).toBe(true)
      await enviar(tela)
      expect(post()).toMatchObject({
        endereco: 'Avenida Paulista, 1600 · Bela Vista',
        cep: '01310200',
        latitude: MOVIDA.latitude,
      })
    })

    it('CEP do ponto que o ViaCEP não conhece: fica sem CEP, com os campos do ponto editáveis', async () => {
      reversa = () => ({ data: { ...ENDERECO_DO_PONTO, cep: '99999999' } })
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(campos(tela)).toMatchObject({
        cep: '',
        rua: 'Avenida Paulista',
        numero: '1600',
        bairro: 'Jardim Paulista',
      })
      expect(editaveis(tela)).toEqual([true, true])
      expect(tela.find('.outro .falha').exists()).toBe(false)
      expect(conferida(tela).exists()).toBe(true)
    })

    it.each([
      [
        'sem endereço no ponto (404)',
        () =>
          erroApi(
            404,
            'localizacao_nao_encontrada',
            'Não encontramos um endereço neste ponto do mapa',
          ),
      ],
      [
        'com o serviço de mapas fora (502)',
        () => erroApi(502, 'geocodificacao_indisponivel', 'O serviço de mapas não respondeu'),
      ],
      [
        'com o tempo esgotado',
        (): RespostaFalsa => {
          throw new ErroTempoEsgotado()
        },
      ],
    ])('%s, marca o outro endereço com a posição e os campos vazios, e avisa', async (_, falha) => {
      reversa = falha
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(marcado(tela)).toBe(true)
      expect(campos(tela)).toEqual({
        cep: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
      })
      expect(editaveis(tela)).toEqual([true, true])
      const aviso = tela.get('.outro .aviso')
      expect(aviso.text()).toBe(AVISO_PONTO)
      expect(aviso.attributes('role')).toBe('status')
      expect(conferida(tela).exists()).toBe(true)

      await tela.get('#novo-cep').setValue('01310200')
      await aguardar()
      await tela.get('.casa input').setValue('1578')
      expect(conferida(tela).exists()).toBe(true)
      await enviar(tela)
      expect(post()).toMatchObject({
        endereco: 'Avenida Paulista, 1578 · Bela Vista',
        cep: '01310200',
        latitude: MOVIDA.latitude,
        longitude: MOVIDA.longitude,
      })
    })

    it('editar à mão o número ou o CEP que vieram do ponto descarta a posição', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      await tela.get('.casa input').setValue('1602')
      expect(conferida(tela).exists()).toBe(false)
      await enviar(tela)
      expect(post()).toMatchObject({ endereco: 'Avenida Paulista, 1602 · Bela Vista' })
      expect(post()).not.toHaveProperty('latitude')

      await moverPino(tela)
      expect(conferida(tela).exists()).toBe(true)
      expect(valor(tela, '.casa input')).toBe('1600')
      await tela.get('#novo-cep').setValue('06010000')
      await aguardar()
      expect(conferida(tela).exists()).toBe(false)
    })

    it('voltar ao endereço de cadastro ou trocar de cliente descarta a posição', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      await tela.get('.outro-endereco input[type="checkbox"]').setValue(false)
      expect(conferida(tela).exists()).toBe(false)
      expect(valor(tela, '#novo-endereco')).toBe('Rua Harmonia, 410 · Vila Madalena')

      await moverPino(tela)
      expect(conferida(tela).exists()).toBe(true)
      await escolherCliente(tela, 'Hotel Ipê')
      expect(conferida(tela).exists()).toBe(false)
      await enviar(tela)
      expect(post()).not.toHaveProperty('latitude')
    })

    it('reabrir abre no pino; confirmar sem mover mantém o endereço do ponto', async () => {
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      const mapa = await abrirMapa(tela)
      expect(leafletFalso.pino.getLatLng()).toEqual({ lat: MOVIDA.latitude, lng: MOVIDA.longitude })
      expect(mapa.get('.endereco').text()).toBe('Avenida Paulista, 1600 · Bela Vista')
      await mapa.get('button.confirmar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('GET', '/api/geocodificacao/reversa')).toHaveLength(1)
      expect(simulada.chamadas('GET', '/api/geocodificacao')).toHaveLength(1)
      expect(campos(tela)).toMatchObject({ cep: '01310-200', numero: '1600' })
      expect(conferida(tela).exists()).toBe(true)
    })

    it('a resposta do ponto que chega depois de trocar de cliente não preenche nada', async () => {
      let responder!: (r: RespostaFalsa) => void
      reversa = () => new Promise((ok) => (responder = ok))
      const { tela } = await abrir()
      await preencher(tela)
      await moverPino(tela)
      expect(marcado(tela)).toBe(true)
      expect(tela.get<HTMLInputElement>('.rua input').element.placeholder).toBe(
        'Buscando o endereço do ponto…',
      )
      await escolherCliente(tela, 'Hotel Ipê')
      responder({ data: ENDERECO_DO_PONTO })
      await aguardar()
      expect(campos(tela)).toMatchObject({ cep: '', rua: '', numero: '' })
      expect(conferida(tela).exists()).toBe(false)
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

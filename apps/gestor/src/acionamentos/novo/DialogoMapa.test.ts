import { ErroTempoEsgotado } from '@kgb/api-client'
import type { VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type RespostaFalsa } from '../../../test/api-falsa'
import { leafletFalso } from '../../../test/leaflet-falso'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import DialogoMapa from './DialogoMapa.vue'
import { CENTRO_SAO_PAULO } from './formulario'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('leaflet', () => import('../../../test/leaflet-falso'))

const ENDERECO = 'Rua Harmonia, 410 · Vila Madalena'
const ACHADA = { latitude: -23.556789, longitude: -46.690123 }
const AVISO_NAO_ACHADO = 'Não achamos o endereço no mapa: arraste o pino até o local'

type Tela = VueWrapper
const coordenadas = (tela: Tela) => tela.get('.coordenadas').text()
const confirmar = (tela: Tela) => tela.get('button.confirmar')
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
const tab = (shiftKey = false) =>
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
  )

describe('DialogoMapa', () => {
  let simulada: ReturnType<typeof simularApi>
  let geocodificar: () => RespostaFalsa | Promise<RespostaFalsa>
  beforeEach(() => {
    leafletFalso.limpar()
    geocodificar = () => ({ data: ACHADA })
    simulada = simularApi(api, { 'GET /api/geocodificacao': () => geocodificar() })
  })

  const abrir = (inicial: { latitude: number; longitude: number } | null = null) =>
    montar(DialogoMapa, { props: { endereco: ENDERECO, inicial }, anexar: true })

  it('é um diálogo modal com o título, o endereço e o foco no painel', async () => {
    const { tela } = await abrir()
    const dialogo = tela.get('[role="dialog"]')
    expect(dialogo.attributes('aria-modal')).toBe('true')
    expect(tela.get(`#${dialogo.attributes('aria-labelledby')}`).text()).toBe(
      'Conferir localização',
    )
    expect(tela.get('.endereco').text()).toBe(ENDERECO)
    expect(document.activeElement).toBe(dialogo.element)
  })

  it('sem posição conhecida, busca o endereço e abre o pino arrastável no resultado', async () => {
    const { tela } = await abrir()
    expect(simulada.chamadas('GET', '/api/geocodificacao')[0]!.params?.query).toEqual({
      endereco: ENDERECO,
    })
    expect(leafletFalso.mapa.centro).toEqual({ lat: ACHADA.latitude, lng: ACHADA.longitude })
    expect(leafletFalso.mapa.zoom).toBe(17)
    expect(leafletFalso.pino.getLatLng()).toEqual({ lat: ACHADA.latitude, lng: ACHADA.longitude })
    expect(leafletFalso.pino.opcoes).toMatchObject({ draggable: true, keyboard: true })
    expect(coordenadas(tela)).toBe('Latitude -23.556789 · Longitude -46.690123')
    expect(tela.find('.aviso').exists()).toBe(false)
    expect(confirmar(tela).attributes('aria-disabled')).toBe('false')
  })

  it('usa os tiles do OpenStreetMap com a atribuição visível', async () => {
    const { tela } = await abrir()
    expect(leafletFalso.camadas[0]!.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    const atribuicao = tela.get('.leaflet-control-attribution')
    expect(atribuicao.text()).toContain('OpenStreetMap')
    expect(atribuicao.get('a').attributes('href')).toBe('https://www.openstreetmap.org/copyright')
  })

  it('os botões de zoom falam português', async () => {
    const { tela } = await abrir()
    expect(leafletFalso.mapa.opcoes.zoomControl).toBe(false)
    const botoes = tela.findAll('.leaflet-control-zoom a')
    expect(botoes.map((b) => b.attributes('title'))).toEqual(['Aproximar', 'Afastar'])
  })

  it('com posição conhecida (assinante ou já conferida), abre nela sem buscar', async () => {
    const conhecida = { latitude: -23.5571, longitude: -46.6912 }
    const { tela } = await abrir(conhecida)
    expect(simulada.chamadas('GET', '/api/geocodificacao')).toHaveLength(0)
    expect(leafletFalso.mapa.centro).toEqual({ lat: -23.5571, lng: -46.6912 })
    expect(leafletFalso.mapa.zoom).toBe(17)
    expect(coordenadas(tela)).toBe('Latitude -23.557100 · Longitude -46.691200')
  })

  it('enquanto busca, avisa e não deixa confirmar', async () => {
    let responder!: (r: RespostaFalsa) => void
    geocodificar = () => new Promise((ok) => (responder = ok))
    const { tela } = await abrir()
    expect(tela.get('.buscando').text()).toBe('Buscando o endereço no mapa…')
    expect(leafletFalso.mapas).toHaveLength(0)
    expect(confirmar(tela).attributes('aria-disabled')).toBe('true')
    await confirmar(tela).trigger('click')
    expect(tela.emitted('confirmar')).toBeUndefined()
    responder({ data: ACHADA })
    await aguardar()
    expect(tela.find('.buscando').exists()).toBe(false)
    expect(leafletFalso.mapas).toHaveLength(1)
    expect(confirmar(tela).attributes('aria-disabled')).toBe('false')
  })

  it.each([
    ['sem resultado (404)', () => erroApi(404, 'localizacao_nao_encontrada', 'Não encontramos')],
    [
      'com o serviço fora (502)',
      () => erroApi(502, 'geocodificacao_indisponivel', 'O serviço de mapas não respondeu'),
    ],
    [
      'com o tempo esgotado',
      (): RespostaFalsa => {
        throw new ErroTempoEsgotado()
      },
    ],
  ])('%s, abre no centro de São Paulo e pede para arrastar o pino', async (_, falha) => {
    geocodificar = falha
    const { tela } = await abrir()
    expect(simulada.chamadas('GET', '/api/geocodificacao')).toHaveLength(1)
    expect(leafletFalso.mapa.centro).toEqual({
      lat: CENTRO_SAO_PAULO.latitude,
      lng: CENTRO_SAO_PAULO.longitude,
    })
    expect(leafletFalso.mapa.zoom).toBe(12)
    const aviso = tela.get('.aviso')
    expect(aviso.text()).toBe(AVISO_NAO_ACHADO)
    expect(aviso.attributes('role')).toBe('status')
    expect(confirmar(tela).attributes('aria-disabled')).toBe('false')
  })

  it('arrastar o pino ou clicar no mapa muda a posição; confirmar devolve com 6 casas', async () => {
    const { tela } = await abrir()
    leafletFalso.pino.arrastarPara(-23.5612345678, -46.6598765432)
    await aguardar()
    expect(coordenadas(tela)).toBe('Latitude -23.561235 · Longitude -46.659877')
    leafletFalso.mapa.clicar(-23.57, -46.65)
    await aguardar()
    expect(leafletFalso.pino.getLatLng()).toEqual({ lat: -23.57, lng: -46.65 })
    expect(coordenadas(tela)).toBe('Latitude -23.570000 · Longitude -46.650000')
    leafletFalso.pino.arrastarPara(-23.5612345678, -46.6598765432)
    await confirmar(tela).trigger('click')
    expect(tela.emitted('confirmar')).toEqual([[{ latitude: -23.561235, longitude: -46.659877 }]])
  })

  it('as setas movem o pino focado, sem mover o mapa', async () => {
    const { tela } = await abrir()
    const pino = leafletFalso.pino.getElement()
    expect(pino.getAttribute('aria-label')).toBe(
      'Pino do local do atendimento: arraste ou use as setas',
    )
    const tecla = (key: string, shiftKey = false) => {
      const evento = new KeyboardEvent('keydown', {
        key,
        shiftKey,
        bubbles: true,
        cancelable: true,
      })
      const noMapa = vi.fn()
      leafletFalso.mapa.container.addEventListener('keydown', noMapa, { once: true })
      pino.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(true)
      expect(noMapa).not.toHaveBeenCalled()
    }
    // Na projeção falsa, 10 px = 0,01 grau; com Shift, 50 px.
    tecla('ArrowRight')
    tecla('ArrowUp')
    await aguardar()
    expect(leafletFalso.pino.getLatLng()).toEqual({ lat: -23.546789, lng: -46.680123 })
    tecla('ArrowLeft', true)
    tecla('ArrowDown', true)
    await aguardar()
    expect(coordenadas(tela)).toBe('Latitude -23.596789 · Longitude -46.730123')
  })

  it('Cancelar, o X e a tecla Esc cancelam sem confirmar', async () => {
    const { tela } = await abrir()
    await tela.get('button.cancelar').trigger('click')
    await tela.get('button.fechar').trigger('click')
    esc()
    expect(tela.emitted('cancelar')).toHaveLength(3)
    expect(tela.emitted('confirmar')).toBeUndefined()
  })

  it('o foco fica preso no diálogo: Tab no último volta ao primeiro, e vice-versa', async () => {
    const { tela } = await abrir()
    const fechar = tela.get('button.fechar').element as HTMLElement
    const ultimo = confirmar(tela).element as HTMLElement
    ultimo.focus()
    tab()
    expect(document.activeElement).toBe(fechar)
    tab(true)
    expect(document.activeElement).toBe(ultimo)
    // Do painel (foco inicial), Shift+Tab vai ao último.
    ;(tela.get('[role="dialog"]').element as HTMLElement).focus()
    tab(true)
    expect(document.activeElement).toBe(ultimo)
  })

  it('ao fechar, desmonta o mapa do Leaflet', async () => {
    const { tela } = await abrir()
    const mapa = leafletFalso.mapa
    tela.unmount()
    expect(mapa.removido).toBe(true)
  })
})

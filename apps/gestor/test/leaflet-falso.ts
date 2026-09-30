/**
 * Leaflet falso para os testes do mapa do Novo acionamento (`vi.mock('leaflet', () =>
 * import('…/test/leaflet-falso'))`). Guarda o que o componente pediu (centro, zoom, camada de
 * tiles, pino) e deixa o teste arrastar o pino e clicar no mapa. A projeção é linear: 1 grau =
 * 1000 px, com a latitude crescendo para cima, como no mapa.
 */

interface LatLng {
  lat: number
  lng: number
}
type EntradaLatLng = LatLng | readonly [number, number]
type Ouvinte = (evento: Record<string, unknown>) => void

const paraLatLng = (x: EntradaLatLng): LatLng =>
  'lat' in x ? { lat: x.lat, lng: x.lng } : { lat: x[0], lng: x[1] }

const PIXELS_POR_GRAU = 1000

class Eventos {
  private ouvintes = new Map<string, Ouvinte[]>()
  on(evento: string, ouvinte: Ouvinte) {
    this.ouvintes.set(evento, [...(this.ouvintes.get(evento) ?? []), ouvinte])
    return this
  }
  fire(evento: string, dados: Record<string, unknown> = {}) {
    for (const ouvinte of this.ouvintes.get(evento) ?? []) ouvinte({ type: evento, ...dados })
    return this
  }
}

export class MapaFalso extends Eventos {
  centro: LatLng
  zoom: number
  removido = false
  constructor(
    readonly container: HTMLElement,
    readonly opcoes: { center: EntradaLatLng; zoom: number } & Record<string, unknown>,
  ) {
    super()
    this.centro = paraLatLng(opcoes.center)
    this.zoom = opcoes.zoom
    // Como o Leaflet: o contêiner entra na ordem do Tab (as setas movem o mapa).
    container.classList.add('leaflet-container')
    container.tabIndex = 0
  }
  setView(centro: EntradaLatLng, zoom: number) {
    this.centro = paraLatLng(centro)
    this.zoom = zoom
    return this
  }
  invalidateSize() {
    return this
  }
  panInside() {
    return this
  }
  latLngToContainerPoint(posicao: EntradaLatLng) {
    const { lat, lng } = paraLatLng(posicao)
    return { x: lng * PIXELS_POR_GRAU, y: -lat * PIXELS_POR_GRAU }
  }
  containerPointToLatLng(ponto: { x: number; y: number } | readonly [number, number]): LatLng {
    const [x, y] = 'x' in ponto ? [ponto.x, ponto.y] : ponto
    return { lat: -y / PIXELS_POR_GRAU, lng: x / PIXELS_POR_GRAU }
  }
  remove() {
    this.removido = true
    this.container.replaceChildren()
    return this
  }
  /** Um clique no mapa, na posição dada. */
  clicar(lat: number, lng: number) {
    return this.fire('click', { latlng: { lat, lng } })
  }
}

export class MarcadorFalso extends Eventos {
  posicao: LatLng
  readonly elemento = document.createElement('div')
  constructor(
    posicao: EntradaLatLng,
    readonly opcoes: { draggable?: boolean; keyboard?: boolean; title?: string; icon?: unknown },
  ) {
    super()
    this.posicao = paraLatLng(posicao)
    this.elemento.className = 'marcador-falso'
    if (opcoes.keyboard) {
      this.elemento.tabIndex = 0
      this.elemento.setAttribute('role', 'button')
    }
    if (opcoes.title) this.elemento.title = opcoes.title
  }
  addTo(mapa: MapaFalso) {
    mapa.container.appendChild(this.elemento)
    return this
  }
  getLatLng(): LatLng {
    return { ...this.posicao }
  }
  setLatLng(posicao: EntradaLatLng) {
    this.posicao = paraLatLng(posicao)
    return this
  }
  getElement() {
    return this.elemento
  }
  /** O arraste do pino até a posição dada, com os eventos do Leaflet. */
  arrastarPara(lat: number, lng: number) {
    this.fire('dragstart')
    this.setLatLng([lat, lng])
    return this.fire('dragend')
  }
}

export class CamadaFalsa {
  constructor(
    readonly url: string,
    readonly opcoes: { attribution?: string; maxZoom?: number },
  ) {}
  /** Como o controle de atribuição do Leaflet: o texto (com os links) aparece no mapa. */
  addTo(mapa: MapaFalso) {
    const atribuicao = document.createElement('div')
    atribuicao.className = 'leaflet-control-attribution'
    atribuicao.innerHTML = this.opcoes.attribution ?? ''
    mapa.container.appendChild(atribuicao)
    return this
  }
}

/** O controle de zoom, com os títulos dados (o do Leaflet usa o título também como aria-label). */
export class ControleZoomFalso {
  constructor(readonly opcoes: { zoomInTitle?: string; zoomOutTitle?: string }) {}
  addTo(mapa: MapaFalso) {
    const controle = document.createElement('div')
    controle.className = 'leaflet-control-zoom'
    for (const [texto, titulo] of [
      ['+', this.opcoes.zoomInTitle ?? 'Zoom in'],
      ['−', this.opcoes.zoomOutTitle ?? 'Zoom out'],
    ] as const) {
      const botao = Object.assign(document.createElement('a'), { href: '#', title: titulo })
      botao.setAttribute('role', 'button')
      botao.setAttribute('aria-label', titulo)
      botao.textContent = texto
      controle.appendChild(botao)
    }
    mapa.container.appendChild(controle)
    return this
  }
}

export const control = {
  zoom: (opcoes: ControleZoomFalso['opcoes'] = {}) => new ControleZoomFalso(opcoes),
}

/** O que o componente criou, para o teste conferir e comandar. */
export const leafletFalso = {
  mapas: [] as MapaFalso[],
  marcadores: [] as MarcadorFalso[],
  camadas: [] as CamadaFalsa[],
  get mapa(): MapaFalso {
    const mapa = this.mapas.at(-1)
    if (!mapa) throw new Error('Nenhum mapa criado')
    return mapa
  },
  get pino(): MarcadorFalso {
    const pino = this.marcadores.at(-1)
    if (!pino) throw new Error('Nenhum pino criado')
    return pino
  },
  limpar() {
    this.mapas.length = 0
    this.marcadores.length = 0
    this.camadas.length = 0
  },
}

export function map(container: HTMLElement, opcoes: MapaFalso['opcoes']) {
  const mapa = new MapaFalso(container, opcoes)
  leafletFalso.mapas.push(mapa)
  return mapa
}

export function marker(posicao: EntradaLatLng, opcoes: MarcadorFalso['opcoes'] = {}) {
  const pino = new MarcadorFalso(posicao, opcoes)
  leafletFalso.marcadores.push(pino)
  return pino
}

export function tileLayer(url: string, opcoes: CamadaFalsa['opcoes'] = {}) {
  const camada = new CamadaFalsa(url, opcoes)
  leafletFalso.camadas.push(camada)
  return camada
}

export function divIcon(opcoes: Record<string, unknown>) {
  return { opcoes }
}

<script setup lang="ts">
import { GEOMETRIA_ICONES, RussoIcone } from '@kgb/ui'
import {
  control,
  divIcon,
  map as criarMapa,
  marker as criarPino,
  tileLayer,
  type LeafletMouseEvent,
  type Map as MapaLeaflet,
  type Marker,
} from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usarGeocodificacao } from './dados'
import { CENTRO_SAO_PAULO, type Localizacao } from './formulario'

/**
 * "Ver no mapa" do Novo acionamento (fora do protótipo, a pedido do usuário em 30/09): o mapa do
 * OpenStreetMap com o pino no endereço em uso, para a gestora conferir e ajustar o local exato.
 */
const props = defineProps<{
  /** O endereço em uso, no formato do sistema (sem o complemento). */
  endereco: string
  /** A posição já conhecida (conferida neste acionamento ou a do assinante); null busca o endereço. */
  inicial: Localizacao | null
}>()
const emit = defineEmits<{ confirmar: [posicao: Localizacao]; cancelar: [] }>()

const ZOOM_ENDERECO = 17
const ZOOM_CIDADE = 12
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const AVISO_NAO_ACHADO = 'Não achamos o endereço no mapa: arraste o pino até o local'
/** O pino do protótipo (ícone "pin"), preenchido na cor primária. */
const SVG_PINO = `<svg viewBox="0 0 24 24" width="40" height="40" stroke-linejoin="round" aria-hidden="true">${GEOMETRIA_ICONES.pin}</svg>`

const { data: achada, isError: naoAchada } = usarGeocodificacao(
  () => props.endereco,
  () => !props.inicial,
)
/**
 * Onde o mapa abre: a posição conhecida ou a achada para o endereço, de perto; sem nenhuma (o
 * endereço não foi achado ou o serviço de mapas falhou), o centro de São Paulo, de longe.
 */
const abertura = computed<{ posicao: Localizacao; zoom: number } | null>(() => {
  if (props.inicial) return { posicao: props.inicial, zoom: ZOOM_ENDERECO }
  if (achada.value) return { posicao: achada.value, zoom: ZOOM_ENDERECO }
  if (naoAchada.value || !props.endereco.trim()) {
    return { posicao: CENTRO_SAO_PAULO, zoom: ZOOM_CIDADE }
  }
  return null
})
const aviso = computed(() =>
  abertura.value && abertura.value.zoom === ZOOM_CIDADE ? AVISO_NAO_ACHADO : '',
)

/** A posição do pino, com 6 casas (uns 10 cm, como a API grava). */
const posicao = ref<Localizacao | null>(null)
const seisCasas = (grau: number) => Math.round(grau * 1e6) / 1e6
const textoPosicao = computed(() =>
  posicao.value
    ? `Latitude ${posicao.value.latitude.toFixed(6)} · Longitude ${posicao.value.longitude.toFixed(6)}`
    : '',
)

const mapaEl = ref<HTMLElement>()
let mapa: MapaLeaflet | null = null
let pino: Marker | null = null

function moverPara(latitude: number, longitude: number) {
  const nova = { latitude: seisCasas(latitude), longitude: seisCasas(longitude) }
  pino?.setLatLng([nova.latitude, nova.longitude])
  posicao.value = nova
}

/** Setas no pino focado: 10 px por toque (50 px com Shift). O mapa acompanha se o pino sair. */
const DIRECOES: Partial<Record<string, readonly [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}
function moverPeloTeclado(e: KeyboardEvent) {
  const direcao = DIRECOES[e.key]
  if (!direcao || !mapa || !pino) return
  // Sem isso, as setas também rolariam a página e moveriam o mapa.
  e.preventDefault()
  e.stopPropagation()
  const passo = e.shiftKey ? 50 : 10
  const ponto = mapa.latLngToContainerPoint(pino.getLatLng())
  const { lat, lng } = mapa.containerPointToLatLng([
    ponto.x + direcao[0] * passo,
    ponto.y + direcao[1] * passo,
  ])
  moverPara(lat, lng)
  mapa.panInside([lat, lng])
}

function criarMapaQuandoPronto() {
  const a = abertura.value
  if (mapa || !a || !mapaEl.value) return
  const centro: [number, number] = [a.posicao.latitude, a.posicao.longitude]
  mapa = criarMapa(mapaEl.value, { center: centro, zoom: a.zoom, zoomControl: false })
  control.zoom({ zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(mapa)
  tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUICAO }).addTo(mapa)
  pino = criarPino(centro, {
    draggable: true,
    autoPan: true,
    keyboard: true,
    title: 'Local do atendimento',
    icon: divIcon({
      className: 'pino-mapa',
      html: SVG_PINO,
      iconSize: [40, 40],
      iconAnchor: [20, 36],
    }),
  }).addTo(mapa)
  const elemento = pino.getElement()
  elemento?.setAttribute('aria-label', 'Pino do local do atendimento: arraste ou use as setas')
  elemento?.addEventListener('keydown', moverPeloTeclado)
  pino.on('dragend', () => {
    const { lat, lng } = pino!.getLatLng()
    moverPara(lat, lng)
  })
  mapa.on('click', (e: LeafletMouseEvent) => moverPara(e.latlng.lat, e.latlng.lng))
  posicao.value = { ...a.posicao }
}
watch(abertura, criarMapaQuandoPronto, { flush: 'post' })

function confirmar() {
  if (posicao.value) emit('confirmar', { ...posicao.value })
}

const painel = ref<HTMLElement>()
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** Tab e Shift+Tab dão a volta dentro do diálogo: o foco não sai para o formulário por trás. */
function prenderFoco(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !painel.value) return
  const focaveis = [...painel.value.querySelectorAll<HTMLElement>(FOCAVEIS)]
  const primeiro = focaveis[0]
  const ultimo = focaveis.at(-1)
  if (!primeiro || !ultimo) return
  const atual = document.activeElement
  if (e.shiftKey && (atual === primeiro || atual === painel.value)) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && atual === ultimo) {
    e.preventDefault()
    primeiro.focus()
  }
}
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancelar')
}
onMounted(() => {
  painel.value?.focus({ preventScroll: true })
  document.addEventListener('keydown', aoTeclar)
  criarMapaQuandoPronto()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', aoTeclar)
  mapa?.remove()
  mapa = null
  pino = null
})
</script>

<template>
  <div class="sobreposicao">
    <div
      ref="painel"
      class="painel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mapa-titulo"
      :aria-describedby="aviso ? 'mapa-aviso' : 'mapa-dica'"
      tabindex="-1"
      @keydown="prenderFoco"
    >
      <div class="cabecalho">
        <div class="textos">
          <h2 id="mapa-titulo" class="titulo">Conferir localização</h2>
          <div class="endereco">{{ endereco }}</div>
        </div>
        <button type="button" class="fechar" aria-label="Fechar" @click="emit('cancelar')">
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div v-if="aviso" id="mapa-aviso" class="aviso" role="status">{{ aviso }}</div>
      <p v-else id="mapa-dica" class="dica">
        Arraste o pino ou clique no mapa para marcar o local exato do atendimento.
      </p>
      <div class="moldura">
        <div ref="mapaEl" class="mapa-leaflet" />
        <div v-if="!abertura" class="buscando">Buscando o endereço no mapa…</div>
      </div>
      <div class="rodape">
        <div class="coordenadas">{{ textoPosicao }}</div>
        <div class="acoes">
          <button type="button" class="cancelar" @click="emit('cancelar')">Cancelar</button>
          <button
            type="button"
            class="confirmar"
            :class="{ inativo: !posicao }"
            :aria-disabled="!posicao"
            @click="confirmar"
          >
            Confirmar localização
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fora do protótipo: no estilo dos modais do gestor (Novo acionamento, Excluir prestador). */
.sobreposicao {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: var(--kgb-sobreposicao);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 24px 12px;
}
.painel {
  width: 100%;
  max-width: 760px;
  margin: auto;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.painel:focus {
  outline: none;
}
.cabecalho {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.textos {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.titulo {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.endereco {
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-secundario);
  overflow-wrap: anywhere;
}
.fechar {
  width: 36px;
  height: 36px;
  flex: none;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-superficie2);
  color: var(--kgb-tinta);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dica {
  margin: 0;
  font-size: 13px;
  color: var(--kgb-texto);
}
.aviso {
  background: var(--kgb-laranja-claro);
  color: var(--kgb-laranja-texto);
  border-radius: 16px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 500;
}
.moldura {
  position: relative;
  height: clamp(260px, 50vh, 420px);
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  overflow: hidden;
  background: var(--kgb-superficie1);
}
.mapa-leaflet {
  position: absolute;
  inset: 0;
  font-family: inherit;
}
.buscando {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--kgb-secundario);
}
/* O ícone do pino é criado pelo Leaflet, fora do template: por isso o :deep. */
.mapa-leaflet :deep(.pino-mapa) {
  background: none;
  border: 0;
}
.mapa-leaflet :deep(.pino-mapa svg) {
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
}
.mapa-leaflet :deep(.pino-mapa path) {
  fill: var(--kgb-primaria);
  stroke: var(--kgb-branco);
  stroke-width: 1.5;
}
.mapa-leaflet :deep(.pino-mapa circle) {
  fill: var(--kgb-branco);
}
.mapa-leaflet :deep(.pino-mapa:focus-visible) {
  outline: 2px solid var(--kgb-primaria);
  outline-offset: 2px;
  border-radius: 12px;
}
.rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.coordenadas {
  font-size: 12px;
  color: var(--kgb-terciario);
  font-variant-numeric: tabular-nums;
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-left: auto;
}
.cancelar,
.confirmar {
  height: 48px;
  border: 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.cancelar {
  padding: 0 20px;
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.confirmar {
  padding: 0 24px;
  background: var(--kgb-primaria);
  color: #fff;
}
.confirmar.inativo {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
  cursor: not-allowed;
}
</style>

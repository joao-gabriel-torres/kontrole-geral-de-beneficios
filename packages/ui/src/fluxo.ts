import { FUSO } from './formatos'

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const formatoMomento = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD" do dia em São Paulo. */
export function dataISO(d: Date): string {
  return formatoDia.format(d)
}

/** "2026-09-28" → "28/09/2026". */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "2026-09-28" → "28/09". */
export function diaMes(iso: string): string {
  return dataBR(iso).slice(0, 5)
}

export function intervalo(inicio: string, fim: string): string {
  return `${inicio}–${fim}`
}

/** "Hoje · 10:30–12:30" ou "29/09 · 09:00–10:00" (app do prestador). */
export function quandoCurto(data: string, inicio: string, fim: string, hoje: string): string {
  return `${data === hoje ? 'Hoje' : diaMes(data)} · ${intervalo(inicio, fim)}`
}

/** Instante ISO → "28/09 · 10:05" no fuso de São Paulo (linha do tempo, envios). */
export function momento(instante: string): string {
  const partes = Object.fromEntries(
    formatoMomento.formatToParts(new Date(instante)).map((p) => [p.type, p.value]),
  )
  return `${partes.day}/${partes.month} · ${partes.hour}:${partes.minute}`
}

export function progresso(etapas: { feitas: number; total: number }): {
  texto: string
  percentual: number
} {
  return {
    texto: `${etapas.feitas}/${etapas.total}`,
    percentual: etapas.total ? Math.round((etapas.feitas / etapas.total) * 100) : 0,
  }
}

/** A posição conferida no mapa, em graus decimais. Sem as duas, vale o endereço. */
export interface PosicaoNoMapa {
  latitude?: number | null
  longitude?: number | null
}

/** Uma parada da rota: o endereço e, quando houver, a posição conferida no mapa. */
export interface ParadaRota extends PosicaoNoMapa {
  endereco: string
}

/**
 * O endereço como busca do Google Maps: " · " vira ", ". Os endereços da capital não levam a
 * cidade e ganham ", São Paulo"; os de outra cidade já terminam com ela ("… · Osasco - SP"). Com a
 * posição conferida no mapa, o destino é ela ("lat,lng"), mais precisa que o endereço.
 */
function destino(endereco: string, posicao?: PosicaoNoMapa | null): string {
  const { latitude, longitude } = posicao ?? {}
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) return `${latitude},${longitude}`
  const texto = endereco.replace(/ · /g, ', ')
  return encodeURIComponent(/ - [A-Z]{2}$/.test(texto) ? texto : `${texto}, São Paulo`)
}

export function urlMapa(endereco: string, posicao?: PosicaoNoMapa | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${destino(endereco, posicao)}`
}

/** A rota na ordem das paradas: cada uma é um endereço ou o endereço com a posição conferida. */
export function urlRota(paradas: readonly (string | ParadaRota)[]): string {
  const destinos = paradas.map((p) => (typeof p === 'string' ? destino(p) : destino(p.endereco, p)))
  return `https://www.google.com/maps/dir/${destinos.join('/')}`
}

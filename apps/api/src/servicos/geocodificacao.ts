import {
  chaveDoEndereco,
  chaveDoPonto,
  consultasDoEndereco,
  dentroDoBrasil,
  normalizarCoordenadas,
  normalizarEnderecoDeBusca,
  pontoDaBusca,
  type Coordenadas,
  type EnderecoDoPonto,
} from '../dominio/localizacao'
import { ErroHttp } from '../erros'

/**
 * Endereço ↔ posição no mapa, atrás de interface: a real vai ao Nominatim, os testes injetam uma
 * falsa.
 */
export interface Geocodificador {
  /** Uma consulta de texto; devolve a posição do primeiro resultado, ou null quando não acha nada. */
  localizar(consulta: string): Promise<Coordenadas | null>
  /** A consulta reversa: o endereço de um ponto do mapa, ou null quando não há nenhum ali. */
  enderecoDoPonto(ponto: Coordenadas): Promise<EnderecoDoPonto | null>
}

/** O geocodificador não respondeu (tempo limite, erro de rede, status ou corpo inesperado, fila cheia). */
export class GeocodificacaoIndisponivel extends Error {
  constructor(mensagem = 'O serviço de mapas não respondeu, tente de novo') {
    super(mensagem)
    this.name = 'GeocodificacaoIndisponivel'
  }
}

export const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search'
export const URL_NOMINATIM_REVERSO = 'https://nominatim.openstreetmap.org/reverse'
/** A política de uso do Nominatim pede um User-Agent que identifique a aplicação. */
export const USER_AGENT_NOMINATIM = 'KGB-RussoAssistencia/1.0 (contato no README)'
export const TEMPO_LIMITE_NOMINATIM = 5000
/** A política de uso do Nominatim: no máximo uma requisição por segundo. */
export const INTERVALO_NOMINATIM = 1000
/** Com mais que isso de fila, responde indisponível na hora em vez de deixar o gestor esperando. */
export const ESPERA_MAXIMA_NOMINATIM = 5000

interface OpcoesNominatim {
  executarFetch?: typeof fetch
  agora?: () => number
  esperar?: (ms: number) => Promise<void>
}

/** "-23.5671492" → -23.5671492; o que não for número vira NaN (e a resposta, inesperada). */
function grau(valor: unknown): number {
  if (typeof valor === 'number') return valor
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor)
  return Number.NaN
}

/** Um texto do endereço do Nominatim, aparado; o que não é texto (ou é vazio) vira null. */
function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

/** O primeiro item de uma lista do Nominatim ("12;14" → "12"), ou null. */
function primeiroDaLista(valor: unknown): string | null {
  return texto(texto(valor)?.split(/[;,]/)[0])
}

/** O primeiro dos campos do endereço do Nominatim que vier preenchido. */
function primeiro(endereco: Record<string, unknown>, campos: readonly string[]): string | null {
  for (const campo of campos) {
    const valor = texto(endereco[campo])
    if (valor) return valor
  }
  return null
}

/** Os campos do Nominatim que valem como rua, bairro e cidade, do mais ao menos preciso. */
const CAMPOS_LOGRADOURO = ['road', 'pedestrian', 'footway', 'path', 'square'] as const
const CAMPOS_BAIRRO = ['suburb', 'neighbourhood', 'quarter', 'city_district', 'district'] as const
/** Sem `municipality`: em São Paulo ele traz a "Região Imediata", não a cidade. */
const CAMPOS_CIDADE = ['city', 'town', 'village'] as const

/** A UF pelo nome do estado (sem acentos), quando o Nominatim não traz o código ISO ("BR-SP"). */
const UF_POR_ESTADO: Readonly<Record<string, string>> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

function ufDoEndereco(endereco: Record<string, unknown>): string | null {
  const iso = /^BR-([A-Z]{2})$/.exec(texto(endereco['ISO3166-2-lvl4']) ?? '')
  if (iso) return iso[1]!
  return UF_POR_ESTADO[chaveDoEndereco(texto(endereco.state) ?? '')] ?? null
}

/** "05435-000" → "05435000"; de uma lista ("05435-000;05435-001"), o primeiro; sem 8 dígitos, null. */
function cepDoEndereco(valor: unknown): string | null {
  const digitos = (primeiroDaLista(valor) ?? '').replace(/\D/g, '')
  return digitos.length === 8 ? digitos : null
}

/**
 * O endereço do reverse do Nominatim (`address` do jsonv2). Fora do Brasil, ou sem nenhum dado de
 * endereço (só o estado e o país, longe de tudo), é "não encontrado".
 */
function lerEnderecoDoPonto(endereco: Record<string, unknown>): EnderecoDoPonto | null {
  const pais = texto(endereco.country_code)
  if (pais && pais.toLowerCase() !== 'br') return null
  const achado: EnderecoDoPonto = {
    cep: cepDoEndereco(endereco.postcode),
    logradouro: primeiro(endereco, CAMPOS_LOGRADOURO),
    numero: primeiroDaLista(endereco.house_number),
    bairro: primeiro(endereco, CAMPOS_BAIRRO),
    cidade: primeiro(endereco, CAMPOS_CIDADE),
    uf: ufDoEndereco(endereco),
  }
  const { cep, logradouro, bairro, cidade } = achado
  return cep || logradouro || bairro || cidade ? achado : null
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * Implementação real: o Nominatim do OpenStreetMap, só no Brasil, com o User-Agent próprio, tempo
 * limite curto e uma requisição por segundo no máximo, com a busca e a consulta reversa na mesma
 * fila (por instância; o processo usa uma só).
 */
export function criarGeocodificadorNominatim(opcoes: OpcoesNominatim = {}): Geocodificador {
  const {
    executarFetch = fetch,
    agora = Date.now,
    esperar = (ms) => new Promise<void>((resolver) => setTimeout(resolver, ms)),
  } = opcoes
  let proximaLiberada = 0

  /** Reserva a vez na fila (sem await antes da reserva: pedidos simultâneos não colidem). */
  async function aguardarVez(): Promise<void> {
    const instante = agora()
    const inicio = Math.max(instante, proximaLiberada)
    const espera = inicio - instante
    if (espera > ESPERA_MAXIMA_NOMINATIM) throw new GeocodificacaoIndisponivel()
    proximaLiberada = inicio + INTERVALO_NOMINATIM
    if (espera > 0) await esperar(espera)
  }

  /** Um pedido ao Nominatim, na vez da fila; qualquer falha vira `GeocodificacaoIndisponivel`. */
  async function pedir(url: string): Promise<unknown> {
    await aguardarVez()
    try {
      const resposta = await executarFetch(url, {
        headers: { 'User-Agent': USER_AGENT_NOMINATIM, 'Accept-Language': 'pt-BR' },
        signal: AbortSignal.timeout(TEMPO_LIMITE_NOMINATIM),
      })
      if (!resposta.ok) throw new GeocodificacaoIndisponivel()
      return await resposta.json()
    } catch {
      throw new GeocodificacaoIndisponivel()
    }
  }

  return {
    async localizar(consulta) {
      const dados = await pedir(
        `${URL_NOMINATIM}?format=jsonv2&limit=1&countrycodes=br&q=` + encodeURIComponent(consulta),
      )
      if (!Array.isArray(dados)) throw new GeocodificacaoIndisponivel()
      if (dados.length === 0) return null
      const primeiro = dados[0] as { lat?: unknown; lon?: unknown } | null
      const latitude = grau(primeiro?.lat)
      const longitude = grau(primeiro?.lon)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new GeocodificacaoIndisponivel()
      }
      return { latitude, longitude }
    },

    async enderecoDoPonto({ latitude, longitude }) {
      const dados = await pedir(
        `${URL_NOMINATIM_REVERSO}?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
      )
      if (!ehObjeto(dados)) throw new GeocodificacaoIndisponivel()
      // Sem nada perto do ponto, o Nominatim responde 200 com { error: "Unable to geocode" }.
      if ('error' in dados) return null
      if (!ehObjeto(dados.address)) throw new GeocodificacaoIndisponivel()
      return lerEnderecoDoPonto(dados.address)
    },
  }
}

/**
 * Endereços já localizados e pontos já consultados (ou não encontrados) guardados no processo, até
 * este limite em cada cache; os mais antigos saem.
 */
export const LIMITE_CACHE_LOCALIZACOES = 500

let geocodificador: Geocodificador = criarGeocodificadorNominatim()
const cache = new Map<string, Promise<Coordenadas | null>>()
const cachePontos = new Map<string, Promise<EnderecoDoPonto | null>>()

/** Troca a implementação nos testes (e esvazia os caches); null volta ao Nominatim real. */
export function trocarGeocodificador(novo: Geocodificador | null): void {
  geocodificador = novo ?? criarGeocodificadorNominatim()
  cache.clear()
  cachePontos.clear()
}

/**
 * A consulta pela chave, no cache: pedidos simultâneos da mesma chave dividem a consulta, e o "não
 * encontrado" (null) também fica guardado. Uma falha do serviço não fica: a próxima tentativa
 * consulta de novo.
 */
function emCache<T>(
  guardados: Map<string, Promise<T>>,
  chave: string,
  consultar: () => Promise<T>,
): Promise<T> {
  const pendente = guardados.get(chave)
  if (pendente) return pendente
  const consulta = consultar()
  if (guardados.size >= LIMITE_CACHE_LOCALIZACOES) guardados.delete(guardados.keys().next().value!)
  guardados.set(chave, consulta)
  consulta.catch(() => {
    if (guardados.get(chave) === consulta) guardados.delete(chave)
  })
  return consulta
}

/** Tenta as consultas do endereço em ordem; resultado fora do Brasil conta como não encontrado. */
async function procurar(g: Geocodificador, endereco: string): Promise<Coordenadas | null> {
  for (const consulta of consultasDoEndereco(endereco)) {
    const achado = await g.localizar(consulta)
    if (achado && dentroDoBrasil(achado)) {
      return normalizarCoordenadas(achado.latitude, achado.longitude)
    }
  }
  return null
}

/**
 * A posição inicial do mapa do Novo acionamento. Valida o endereço, usa o cache e traduz "não
 * achou" em 404.
 */
export async function localizarEndereco(texto: string | undefined): Promise<Coordenadas> {
  const endereco = normalizarEnderecoDeBusca(texto)
  const g = geocodificador
  const achado = await emCache(cache, chaveDoEndereco(endereco), () => procurar(g, endereco))
  if (!achado) {
    throw new ErroHttp(404, 'localizacao_nao_encontrada', 'Não encontramos este endereço no mapa')
  }
  return achado
}

/**
 * O endereço do ponto em que a gestora deixou o pino (consulta reversa), para preencher o outro
 * endereço do Novo acionamento. Valida o ponto (no Brasil, 6 casas), usa o cache e traduz "não
 * achou" em 404.
 */
export async function buscarEnderecoDoPonto(
  latitude: string | undefined,
  longitude: string | undefined,
): Promise<EnderecoDoPonto> {
  const ponto = pontoDaBusca(latitude, longitude)
  const g = geocodificador
  const achado = await emCache(cachePontos, chaveDoPonto(ponto), () => g.enderecoDoPonto(ponto))
  if (!achado) {
    throw new ErroHttp(
      404,
      'localizacao_nao_encontrada',
      'Não encontramos um endereço neste ponto do mapa',
    )
  }
  return achado
}

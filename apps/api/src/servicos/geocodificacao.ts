import {
  chaveDoEndereco,
  consultasDoEndereco,
  dentroDoBrasil,
  normalizarCoordenadas,
  normalizarEnderecoDeBusca,
  type Coordenadas,
} from '../dominio/localizacao'
import { ErroHttp } from '../erros'

/** Endereço → posição no mapa, atrás de interface: a real vai ao Nominatim, os testes injetam uma falsa. */
export interface Geocodificador {
  /** Uma consulta de texto; devolve a posição do primeiro resultado, ou null quando não acha nada. */
  localizar(consulta: string): Promise<Coordenadas | null>
}

/** O geocodificador não respondeu (tempo limite, erro de rede, status ou corpo inesperado, fila cheia). */
export class GeocodificacaoIndisponivel extends Error {
  constructor(mensagem = 'O serviço de mapas não respondeu, tente de novo') {
    super(mensagem)
    this.name = 'GeocodificacaoIndisponivel'
  }
}

export const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search'
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

/**
 * Implementação real: o Nominatim do OpenStreetMap, só no Brasil, com o User-Agent próprio, tempo
 * limite curto e uma requisição por segundo no máximo (por instância; o processo usa uma só).
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

  return {
    async localizar(consulta) {
      await aguardarVez()
      const url =
        `${URL_NOMINATIM}?format=jsonv2&limit=1&countrycodes=br&q=` + encodeURIComponent(consulta)
      let dados: unknown
      try {
        const resposta = await executarFetch(url, {
          headers: { 'User-Agent': USER_AGENT_NOMINATIM, 'Accept-Language': 'pt-BR' },
          signal: AbortSignal.timeout(TEMPO_LIMITE_NOMINATIM),
        })
        if (!resposta.ok) throw new GeocodificacaoIndisponivel()
        dados = await resposta.json()
      } catch {
        throw new GeocodificacaoIndisponivel()
      }
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
  }
}

/** Endereços já localizados (ou não encontrados) guardados no processo; os mais antigos saem. */
export const LIMITE_CACHE_LOCALIZACOES = 500

let geocodificador: Geocodificador = criarGeocodificadorNominatim()
const cache = new Map<string, Promise<Coordenadas | null>>()

/** Troca a implementação nos testes (e esvazia o cache); null volta ao Nominatim real. */
export function trocarGeocodificador(novo: Geocodificador | null): void {
  geocodificador = novo ?? criarGeocodificadorNominatim()
  cache.clear()
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
 * A posição inicial do mapa do Novo acionamento. Valida o endereço, usa o cache (pedidos
 * simultâneos do mesmo endereço dividem a consulta) e traduz "não achou" em 404. Uma falha do
 * serviço não fica no cache: a próxima tentativa consulta de novo.
 */
export async function localizarEndereco(texto: string | undefined): Promise<Coordenadas> {
  const endereco = normalizarEnderecoDeBusca(texto)
  const chave = chaveDoEndereco(endereco)
  let pendente = cache.get(chave)
  if (!pendente) {
    const consulta = procurar(geocodificador, endereco)
    pendente = consulta
    if (cache.size >= LIMITE_CACHE_LOCALIZACOES) cache.delete(cache.keys().next().value!)
    cache.set(chave, consulta)
    consulta.catch(() => {
      if (cache.get(chave) === consulta) cache.delete(chave)
    })
  }
  const achado = await pendente
  if (!achado) {
    throw new ErroHttp(404, 'localizacao_nao_encontrada', 'Não encontramos este endereço no mapa')
  }
  return achado
}

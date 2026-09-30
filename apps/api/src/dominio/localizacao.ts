import { ErroDominio } from './acionamento'
import { montarEndereco } from './cep'

/** Uma posição no mapa, em graus decimais. */
export interface Coordenadas {
  latitude: number
  longitude: number
}

/**
 * A faixa do Brasil: o retângulo dos pontos extremos (Monte Caburaí, Arroio Chuí, Serra do
 * Contamana e as ilhas de Martim Vaz), com uma folga pequena. Pega um pouco dos vizinhos, mas
 * recusa o que é claramente engano: sinal trocado, latitude no lugar da longitude, outro país.
 */
export const FAIXA_DO_BRASIL = {
  latitude: { minima: -34, maxima: 5.5 },
  longitude: { minima: -74.5, maxima: -28.5 },
} as const

export function dentroDoBrasil({ latitude, longitude }: Coordenadas): boolean {
  const { latitude: lat, longitude: lng } = FAIXA_DO_BRASIL
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= lat.minima &&
    latitude <= lat.maxima &&
    longitude >= lng.minima &&
    longitude <= lng.maxima
  )
}

/** 6 casas decimais (uns 10 cm): mais que isso é ruído do arraste do pino. */
const arredondar = (grau: number) => Math.round(grau * 1e6) / 1e6

/**
 * A localização conferida que veio do formulário: nenhuma das duas é "sem localização" (null); as
 * duas precisam vir juntas e cair no Brasil. Devolve arredondada a 6 casas.
 */
export function normalizarCoordenadas(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Coordenadas | null {
  if (latitude == null && longitude == null) return null
  if (latitude == null || longitude == null) {
    throw new ErroDominio('localizacao_invalida', 'Informe a latitude e a longitude juntas')
  }
  if (!dentroDoBrasil({ latitude, longitude })) {
    throw new ErroDominio('localizacao_invalida', 'A localização precisa ficar no Brasil')
  }
  return { latitude: arredondar(latitude), longitude: arredondar(longitude) }
}

/**
 * O ponto da consulta reversa (o pino movido no mapa), como veio na busca: as duas coordenadas em
 * graus decimais, dentro do Brasil. Devolve arredondado a 6 casas, como a localização conferida.
 */
export function pontoDaBusca(
  latitude: string | undefined,
  longitude: string | undefined,
): Coordenadas {
  const textos = [latitude?.trim() ?? '', longitude?.trim() ?? '']
  if (textos.some((t) => !t)) {
    throw new ErroDominio('localizacao_invalida', 'Informe a latitude e a longitude')
  }
  const [lat, lng] = textos.map(Number) as [number, number]
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ErroDominio(
      'localizacao_invalida',
      'Informe a latitude e a longitude em graus decimais',
    )
  }
  return normalizarCoordenadas(lat, lng)!
}

/** A chave do cache de endereços por ponto: a posição com 6 casas (uns 10 cm). */
export function chaveDoPonto({ latitude, longitude }: Coordenadas): string {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

/**
 * O endereço de um ponto do mapa (consulta reversa), para preencher o outro endereço quando a
 * gestora move o pino. Cada campo vem quando o mapa o conhece; o CEP, só com os 8 dígitos.
 */
export interface EnderecoDoPonto {
  cep: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

/** O mesmo limite do endereço do Novo acionamento. */
export const TAMANHO_MAXIMO_ENDERECO = 300

/** O endereço a localizar: aparado e com os espaços repetidos juntados. Vazio ou longo é recusado. */
export function normalizarEnderecoDeBusca(texto: string | undefined): string {
  const endereco = (texto ?? '').replace(/\s+/g, ' ').trim()
  if (!endereco) throw new ErroDominio('endereco_obrigatorio', 'Informe o endereço')
  if (endereco.length > TAMANHO_MAXIMO_ENDERECO) {
    throw new ErroDominio(
      'endereco_longo',
      `O endereço passa de ${TAMANHO_MAXIMO_ENDERECO} caracteres`,
    )
  }
  return endereco
}

/** A chave do cache de localizações: o endereço sem acentos, sem maiúsculas e sem espaços a mais. */
export function chaveDoEndereco(endereco: string): string {
  return endereco
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** A cidade dos endereços que não trazem a sua (os da capital, no formato do protótipo). */
const CIDADE_PADRAO = 'São Paulo'
/** "Osasco - SP": a cidade no fim dos endereços de fora da capital. */
const CIDADE_COM_UF = /^(.+) - ([A-Z]{2})$/

/**
 * As consultas de texto para o geocodificador, na ordem de tentativa. O endereço vem no formato
 * do sistema ("Rua Harmonia, 410, apto 52 · Vila Madalena", com " · Osasco - SP" no fim fora da
 * capital): o complemento sai (o mapa não o conhece), a cidade entra, e a segunda tentativa deixa
 * de fora o bairro, que muitas vezes é o nome popular e não casa com o do mapa. Texto livre (sem
 * " · ") vai como veio, com a cidade como no link do mapa (`urlMapa`).
 */
export function consultasDoEndereco(endereco: string): string[] {
  const partes = endereco
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
  if (partes.length < 2) {
    const texto = endereco.trim()
    const comUf = CIDADE_COM_UF.exec(texto)
    return [comUf ? `${comUf[1]}, ${comUf[2]}` : `${texto}, ${CIDADE_PADRAO}`]
  }
  const [rua, ...resto] = partes as [string, ...string[]]
  const comUf = CIDADE_COM_UF.exec(resto.at(-1) ?? '')
  const cidade = comUf ? `${comUf[1]}, ${comUf[2]}` : CIDADE_PADRAO
  const bairros = comUf ? resto.slice(0, -1) : resto
  const logradouroENumero = rua
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const consultas = [
    [logradouroENumero, ...bairros, cidade].join(', '),
    [logradouroENumero, cidade].join(', '),
  ]
  return [...new Set(consultas)]
}

/**
 * O atendimento é no endereço do próprio assinante? É quando não veio um CEP diferente do dele e o
 * endereço gravado é o dele (o modal o monta a partir do assinante, com a cidade no fim fora da
 * capital). O mesmo CEP com outro número ou complemento é outro endereço: a posição conferida não
 * pode ir para o cadastro do assinante.
 */
export function ehEnderecoDoAssinante(
  atendimento: { cep: string | null; endereco: string },
  assinante: {
    cep: string
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
  },
): boolean {
  if (atendimento.cep !== null && atendimento.cep !== assinante.cep) return false
  const doAssinante = montarEndereco(assinante)
  return (
    atendimento.endereco === doAssinante || atendimento.endereco.startsWith(`${doAssinante} · `)
  )
}

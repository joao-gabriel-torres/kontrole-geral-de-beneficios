import type { components, PrestadorOpcao, TipoDemanda } from '@kgb/api-client'
import type { NovoAcionamento } from '../dados'

export type Assinante = components['schemas']['Assinante']
export type EnderecoCep = components['schemas']['EnderecoCep']
/** Uma posição no mapa, em graus decimais. */
export type Localizacao = components['schemas']['Localizacao']

export interface FormularioAcionamento {
  titulo: string
  tipoIds: string[]
  /** O assinante escolhido na busca: o cliente, o endereço e o CEP saem dele. */
  assinante: Assinante | null
  /** Atendimento fora do endereço do assinante: CEP consultado, número e complemento digitados. */
  outroEndereco: boolean
  cep: string
  /** A consulta disse que o CEP não existe (404): o envio fica bloqueado até corrigir. */
  cepInexistente: boolean
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  data: string
  inicio: string
  fim: string
  prestadorId: string
  /**
   * A posição confirmada no mapa ("Localização conferida"). Vale para o cliente, o CEP e o endereço
   * em uso quando foi confirmada: trocar qualquer um deles a descarta (`chaveDaLocalizacao`).
   */
  localizacao: Localizacao | null
}

/** Uma opção das buscas de cliente e de prestador (título e, abaixo, o detalhe). */
export interface OpcaoBusca {
  id: string
  titulo: string
  detalhe?: string | null
}

/** O protótipo abre o formulário com o Carlos (p1). Sem ele entre os ativos, vale o primeiro. */
export const PRESTADOR_PADRAO = 'p1'

export function prestadorPadrao(prestadores: readonly PrestadorOpcao[]): string {
  return prestadores.find((p) => p.id === PRESTADOR_PADRAO)?.id ?? prestadores[0]?.id ?? ''
}

export function formularioInicial(
  hoje: string,
  prestadores: readonly PrestadorOpcao[],
): FormularioAcionamento {
  return {
    titulo: '',
    tipoIds: [],
    assinante: null,
    outroEndereco: false,
    cep: '',
    cepInexistente: false,
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    data: hoje,
    inicio: '09:00',
    fim: '11:00',
    prestadorId: prestadorPadrao(prestadores),
    localizacao: null,
  }
}

/** Só os dígitos do CEP, no máximo 8. */
export const digitosCep = (texto: string): string => texto.replace(/\D/g, '').slice(0, 8)

/** "01310200" → "01310-200", enquanto é digitado. */
export function formatarCep(texto: string): string {
  const d = digitosCep(texto)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const MENSAGEM_CEP = 'Informe um CEP com 8 dígitos'

/** O erro local do campo CEP: só para um CEP começado e incompleto. */
export function erroDoCep(texto: string): string {
  const n = digitosCep(texto).length
  return n > 0 && n < 8 ? MENSAGEM_CEP : ''
}

/**
 * Faixas de CEP por UF (Correios), pelos 5 primeiros dígitos: a consulta de CEP da API devolve a
 * cidade sem a UF.
 */
const FAIXAS_UF: readonly (readonly [inicio: number, fim: number, uf: string])[] = [
  [1000, 19999, 'SP'],
  [20000, 28999, 'RJ'],
  [29000, 29999, 'ES'],
  [30000, 39999, 'MG'],
  [40000, 48999, 'BA'],
  [49000, 49999, 'SE'],
  [50000, 56999, 'PE'],
  [57000, 57999, 'AL'],
  [58000, 58999, 'PB'],
  [59000, 59999, 'RN'],
  [60000, 63999, 'CE'],
  [64000, 64999, 'PI'],
  [65000, 65999, 'MA'],
  [66000, 68899, 'PA'],
  [68900, 68999, 'AP'],
  [69000, 69299, 'AM'],
  [69300, 69399, 'RR'],
  [69400, 69899, 'AM'],
  [69900, 69999, 'AC'],
  [70000, 72799, 'DF'],
  [72800, 72999, 'GO'],
  [73000, 73699, 'DF'],
  [73700, 76799, 'GO'],
  [76800, 76999, 'RO'],
  [77000, 77999, 'TO'],
  [78000, 78899, 'MT'],
  [79000, 79999, 'MS'],
  [80000, 87999, 'PR'],
  [88000, 89999, 'SC'],
  [90000, 99999, 'RS'],
]

/** A UF de um CEP de 8 dígitos (com ou sem hífen), ou vazio. */
export function ufDoCep(cep: string): string {
  const digitos = digitosCep(cep)
  if (digitos.length !== 8) return ''
  const prefixo = Number(digitos.slice(0, 5))
  return FAIXAS_UF.find(([inicio, fim]) => prefixo >= inicio && prefixo <= fim)?.[2] ?? ''
}

/**
 * "Osasco - SP": a cidade que vai no fim do endereço quando o CEP é de outra cidade. Na capital
 * (ou sem cidade), vazio: os endereços de São Paulo continuam sem a cidade.
 */
export function cidadeForaDaCapital(cidade: string, cep: string): string {
  const nome = cidade.trim()
  if (!nome || normalizarBusca(nome) === 'sao paulo') return ''
  const uf = ufDoCep(cep)
  return uf ? `${nome} - ${uf}` : nome
}

/**
 * "Rua Harmonia, 410 · Vila Madalena", no formato do protótipo; o complemento vem após o número e,
 * fora da capital, a cidade vai no fim ("Rua X, 12 · Centro · Osasco - SP").
 */
export function montarEndereco(p: {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  /** Já no formato "Osasco - SP" (`cidadeForaDaCapital`); vazio na capital. */
  cidade?: string
}): string {
  const rua = [p.logradouro, p.numero, p.complemento].map((x) => x.trim()).filter(Boolean)
  return [rua.join(', '), p.bairro.trim(), p.cidade?.trim() ?? ''].filter(Boolean).join(' · ')
}

/** O endereço de exibição do assinante, com a cidade no fim quando não é a capital. */
function enderecoDoAssinante(a: Assinante | null): string {
  if (!a) return ''
  const cidade = cidadeForaDaCapital(a.cidade, a.cep)
  return cidade && !a.endereco.endsWith(cidade) ? `${a.endereco} · ${cidade}` : a.endereco
}

/** O endereço digitado em outro endereço, com a cidade do CEP (fora da capital). */
function enderecoDigitado(f: FormularioAcionamento, complemento: string): string {
  return montarEndereco({ ...f, complemento, cidade: cidadeForaDaCapital(f.cidade, f.cep) })
}

/** O endereço do atendimento: o do assinante ou o digitado em outro endereço. */
export function enderecoDoFormulario(f: FormularioAcionamento): string {
  if (f.outroEndereco) return enderecoDigitado(f, f.complemento)
  return enderecoDoAssinante(f.assinante)
}

/** O endereço para o "Ver no mapa" (sem o complemento), ou vazio enquanto não há rua e número. */
export function enderecoDoMapa(f: FormularioAcionamento): string {
  if (!f.outroEndereco) return enderecoDoAssinante(f.assinante)
  if (!f.logradouro.trim() || !f.numero.trim()) return ''
  return enderecoDigitado(f, '')
}

/** Onde o mapa abre quando o endereço não é achado: a Praça da Sé, no centro de São Paulo. */
export const CENTRO_SAO_PAULO: Localizacao = { latitude: -23.55052, longitude: -46.633308 }

/**
 * A posição que o mapa já conhece para o endereço em uso: a localização conferida neste formulário
 * ou, no endereço do próprio assinante, a última conferida para ele. Sem nenhuma, null: o mapa
 * procura o endereço.
 */
export function posicaoConhecida(f: FormularioAcionamento): Localizacao | null {
  return f.localizacao ?? localizacaoDoAssinante(f)
}

/**
 * A última localização conferida para o assinante, quando o atendimento é no endereço dele: o
 * acionamento já nasce com ela conferida (o gestor validou aquele local antes). Em outro endereço,
 * ou sem posição salva, null.
 */
export function localizacaoDoAssinante(f: FormularioAcionamento): Localizacao | null {
  const a = f.assinante
  if (f.outroEndereco || a?.latitude == null || a.longitude == null) return null
  return { latitude: a.latitude, longitude: a.longitude }
}

/**
 * O lugar a que a localização conferida se refere: o cliente, se é o endereço dele ou outro, o CEP
 * e o endereço do mapa. Quando a chave muda, a localização conferida é descartada.
 */
export function chaveDaLocalizacao(f: FormularioAcionamento): string {
  const cep = f.outroEndereco ? digitosCep(f.cep) : (f.assinante?.cep ?? '')
  return JSON.stringify([f.assinante?.id ?? '', f.outroEndereco, cep, enderecoDoMapa(f)])
}

/** O CEP em uso (8 dígitos) para ordenar os prestadores, ou vazio. */
export function cepDeReferencia(f: FormularioAcionamento): string {
  const cep = f.outroEndereco ? digitosCep(f.cep) : (f.assinante?.cep ?? '')
  return cep.length === 8 ? cep : ''
}

/**
 * Título, ≥ 1 tipo, cliente escolhido na busca, data, início < fim (HH:MM) e prestador. Em outro
 * endereço, também CEP com 8 dígitos que exista, rua e número.
 */
export function formularioValido(f: FormularioAcionamento): boolean {
  const endereco = f.outroEndereco
    ? digitosCep(f.cep).length === 8 &&
      !f.cepInexistente &&
      !!f.logradouro.trim() &&
      !!f.numero.trim()
    : true
  return Boolean(
    f.titulo.trim() &&
    f.tipoIds.length &&
    f.assinante &&
    endereco &&
    f.data &&
    f.inicio &&
    f.fim &&
    f.inicio < f.fim &&
    f.prestadorId,
  )
}

export function alternarTipo(tipoIds: readonly string[], id: string): string[] {
  return tipoIds.includes(id) ? tipoIds.filter((t) => t !== id) : [...tipoIds, id]
}

/** Texto para comparar nas buscas: sem acentos, sem maiúsculas e sem espaços nas pontas. */
export const normalizarBusca = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** A categoria dos tipos sem categoria. */
export const SEM_CATEGORIA = 'Outros'

export interface GrupoTipos {
  categoria: string
  tipos: TipoDemanda[]
}

const porNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR')

/**
 * A lista suspensa da busca de tipos: agrupada por categoria (em ordem alfabética, "Outros" no
 * fim), com os tipos por nome. Filtra pelo nome do tipo ou da categoria.
 */
export function gruposDeTipos(tipos: readonly TipoDemanda[], busca: string): GrupoTipos[] {
  const termo = normalizarBusca(busca)
  const grupos = new Map<string, TipoDemanda[]>()
  for (const t of tipos) {
    const categoria = t.categoria?.trim() || SEM_CATEGORIA
    const casa = [t.nome, categoria].some((texto) => normalizarBusca(texto).includes(termo))
    if (termo && !casa) continue
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), t])
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : porNome(a, b)))
    .map(([categoria, lista]) => ({
      categoria,
      tipos: [...lista].sort((a, b) => porNome(a.nome, b.nome)),
    }))
}

/**
 * O tipo que o Enter liga na busca: o primeiro da lista (na ordem mostrada) cujo nome casa com a
 * busca; sem nenhum pelo nome, o primeiro que casa só pela categoria ("eletr" liga "Revisão
 * elétrica", não "Ponto de luz", que só é da categoria Elétrica).
 */
export function tipoDoEnter(grupos: readonly GrupoTipos[], busca: string): TipoDemanda | undefined {
  const termo = normalizarBusca(busca)
  const lista = grupos.flatMap((g) => g.tipos)
  return lista.find((t) => normalizarBusca(t.nome).includes(termo)) ?? lista[0]
}

/**
 * O mais próximo do CEP da lista: o primeiro, que a API ordena pela distância. Só quando ele tem CEP:
 * sem nenhum prestador com CEP, a lista vem por nome e ninguém é o mais próximo.
 */
export function prestadorMaisProximo(
  cep: string,
  prestadores: readonly PrestadorOpcao[],
): string | undefined {
  const primeiro = prestadores[0]
  return cep && primeiro?.cep ? primeiro.id : undefined
}

/** Busca de prestadores por nome ou região, mantendo a ordem da API (proximidade). */
export function filtrarPrestadores(
  prestadores: readonly PrestadorOpcao[],
  busca: string,
): PrestadorOpcao[] {
  const termo = normalizarBusca(busca)
  if (!termo) return [...prestadores]
  return prestadores.filter((p) => normalizarBusca(`${p.nome} ${p.regiao ?? ''}`).includes(termo))
}

export interface PreviaTipo {
  id: string
  nome: string
  cor: string
  etapas: readonly string[]
}

/** O checklist que será copiado, na ordem em que os tipos foram escolhidos. */
export function previaChecklist(
  tipos: readonly TipoDemanda[],
  tipoIds: readonly string[],
): PreviaTipo[] {
  return tipoIds.flatMap((id) => {
    const t = tipos.find((x) => x.id === id)
    return t ? [{ id: t.id, nome: t.nome, cor: t.cor, etapas: t.checklist }] : []
  })
}

export function rotuloContagem(previa: readonly PreviaTipo[]): string {
  const n = previa.reduce((soma, t) => soma + t.etapas.length, 0)
  return `${n} ${n === 1 ? 'item' : 'itens'} no checklist`
}

export function rotuloPrestador(p: PrestadorOpcao): string {
  return p.regiao ? `${p.nome} · ${p.regiao}` : p.nome
}

export function corpoDoFormulario(f: FormularioAcionamento): NovoAcionamento {
  const cep = f.outroEndereco ? digitosCep(f.cep) : (f.assinante?.cep ?? '')
  return {
    titulo: f.titulo.trim(),
    cliente: f.assinante?.nome ?? '',
    endereco: enderecoDoFormulario(f),
    ...(f.assinante ? { assinanteId: f.assinante.id } : {}),
    ...(cep ? { cep } : {}),
    ...(f.localizacao
      ? { latitude: f.localizacao.latitude, longitude: f.localizacao.longitude }
      : {}),
    data: f.data,
    inicio: f.inicio,
    fim: f.fim,
    tipoIds: [...f.tipoIds],
    prestadorId: f.prestadorId,
  }
}

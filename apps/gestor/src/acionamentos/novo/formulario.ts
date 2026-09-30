import type { components, PrestadorOpcao, TipoDemanda } from '@kgb/api-client'
import type { NovoAcionamento } from '../dados'

export type Assinante = components['schemas']['Assinante']
export type EnderecoCep = components['schemas']['EnderecoCep']

export interface FormularioAcionamento {
  titulo: string
  tipoIds: string[]
  /** O assinante escolhido na busca: o cliente, o endereço e o CEP saem dele. */
  assinante: Assinante | null
  /** Atendimento fora do endereço do assinante: CEP consultado, número e complemento digitados. */
  outroEndereco: boolean
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  data: string
  inicio: string
  fim: string
  prestadorId: string
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
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    data: hoje,
    inicio: '09:00',
    fim: '11:00',
    prestadorId: prestadorPadrao(prestadores),
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

/** "Rua Harmonia, 410 · Vila Madalena", no formato do protótipo; o complemento vem após o número. */
export function montarEndereco(p: {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
}): string {
  const rua = [p.logradouro, p.numero, p.complemento].map((x) => x.trim()).filter(Boolean)
  const bairro = p.bairro.trim()
  return bairro ? `${rua.join(', ')} · ${bairro}` : rua.join(', ')
}

/** O endereço do atendimento: o do assinante ou o digitado em outro endereço. */
export function enderecoDoFormulario(f: FormularioAcionamento): string {
  if (f.outroEndereco) return montarEndereco(f)
  return f.assinante?.endereco ?? ''
}

/** O endereço para o "Ver no mapa" (sem o complemento), ou vazio enquanto não há rua e número. */
export function enderecoDoMapa(f: FormularioAcionamento): string {
  if (!f.outroEndereco) return f.assinante?.endereco ?? ''
  if (!f.logradouro.trim() || !f.numero.trim()) return ''
  return montarEndereco({ ...f, complemento: '' })
}

/** O CEP em uso (8 dígitos) para ordenar os prestadores, ou vazio. */
export function cepDeReferencia(f: FormularioAcionamento): string {
  const cep = f.outroEndereco ? digitosCep(f.cep) : (f.assinante?.cep ?? '')
  return cep.length === 8 ? cep : ''
}

/**
 * Título, ≥ 1 tipo, cliente escolhido na busca, data, início < fim (HH:MM) e prestador. Em outro
 * endereço, também CEP com 8 dígitos, rua e número.
 */
export function formularioValido(f: FormularioAcionamento): boolean {
  const endereco = f.outroEndereco
    ? digitosCep(f.cep).length === 8 && !!f.logradouro.trim() && !!f.numero.trim()
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
    data: f.data,
    inicio: f.inicio,
    fim: f.fim,
    tipoIds: [...f.tipoIds],
    prestadorId: f.prestadorId,
  }
}

import { ErroDominio, type StatusAcionamento } from './acionamento'
import { normalizarCepOpcional } from './cep'
import { emailValido } from './convites'
import {
  digitosVerificadoresValidos,
  soDigitos,
  telefoneValido,
  tipoDeDocumento,
} from './documentos'

/** Campos do endereço do prestador além do CEP, todos opcionais. */
type CampoEndereco = 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf'

/** O que o formulário do cadastro envia (criar e editar). */
export interface DadosPrestador extends Partial<Record<CampoEndereco, string | null>> {
  nome: string
  documento: string
  telefone: string
  email?: string | null
  regiao?: string | null
  cep?: string | null
  especialidades: string[]
}

/**
 * Como o cadastro é gravado: documento, telefone e CEP só com dígitos, UF em maiúsculas e
 * opcionais vazios como null.
 */
export interface PrestadorNormalizado extends Record<CampoEndereco, string | null> {
  nome: string
  documento: string
  telefone: string
  email: string | null
  regiao: string | null
  cep: string | null
  especialidades: string[]
}

export function normalizarPrestador(d: DadosPrestador): PrestadorNormalizado {
  const opcional = (texto?: string | null) => texto?.trim() || null
  return {
    nome: d.nome.trim(),
    documento: soDigitos(d.documento),
    telefone: soDigitos(d.telefone),
    email: opcional(d.email),
    regiao: opcional(d.regiao),
    cep: normalizarCepOpcional(d.cep),
    logradouro: opcional(d.logradouro),
    numero: opcional(d.numero),
    complemento: opcional(d.complemento),
    bairro: opcional(d.bairro),
    cidade: opcional(d.cidade),
    uf: opcional(d.uf)?.toUpperCase() ?? null,
    especialidades: [...new Set(d.especialidades)],
  }
}

const UF_VALIDA = /^[A-Z]{2}$/

export interface ContextoValidacao {
  /** Dígitos do documento já gravado (edição): o mesmo documento não passa pelo DV. */
  documentoAtual?: string
  /** Nome de outro prestador não excluído com os mesmos dígitos, se houver. */
  donoDoDocumento?: string | null
}

/**
 * Valida na ordem do modal e mostra só o primeiro erro: a UF, quando informada (o CEP, que vem
 * antes, já é recusado ao normalizar), e depois a ordem do protótipo: nome, tamanho do documento,
 * duplicado, dígitos verificadores (só em documento novo ou alterado; os do seed não passam),
 * telefone com DDD e, quando informado, o e-mail.
 */
export function validarPrestador(
  p: PrestadorNormalizado,
  { documentoAtual, donoDoDocumento }: ContextoValidacao,
): void {
  if (p.uf && !UF_VALIDA.test(p.uf)) {
    throw new ErroDominio('uf_invalida', 'Informe a UF com 2 letras')
  }
  if (!p.nome) throw new ErroDominio('nome_obrigatorio', 'Informe o nome')
  if (!tipoDeDocumento(p.documento)) {
    throw new ErroDominio('documento_invalido', 'CPF ou CNPJ inválido')
  }
  if (donoDoDocumento) {
    throw new ErroDominio(
      'documento_duplicado',
      `Documento já cadastrado para ${donoDoDocumento}`,
      409,
    )
  }
  if (p.documento !== documentoAtual && !digitosVerificadoresValidos(p.documento)) {
    throw new ErroDominio('documento_invalido', 'CPF ou CNPJ inválido')
  }
  if (!telefoneValido(p.telefone)) {
    throw new ErroDominio('telefone_invalido', 'Informe o telefone com DDD')
  }
  // O e-mail vira o login do convite: um texto como "a@x.com; b@y.com" levaria o link a outro.
  if (p.email && !emailValido(p.email)) {
    throw new ErroDominio('email_invalido', 'Informe um e-mail válido')
  }
}

/** Status que contam como "em aberto" na tela de Prestadores (inclui o aguardando aprovação). */
export const STATUS_EM_ABERTO = [
  'aberto',
  'em_andamento',
  'reprovado',
  'aguardando',
] as const satisfies readonly StatusAcionamento[]

export interface Carga {
  emAberto: number
  total: number
}

/** "X em aberto · Y no total" de cada prestador, a partir das contagens por status. */
export function somarCarga(
  grupos: readonly { prestadorId: string; status: string; quantidade: number }[],
): Map<string, Carga> {
  const emAberto: readonly string[] = STATUS_EM_ABERTO
  const carga = new Map<string, Carga>()
  for (const g of grupos) {
    const atual = carga.get(g.prestadorId) ?? { emAberto: 0, total: 0 }
    atual.total += g.quantidade
    if (emAberto.includes(g.status)) atual.emAberto += g.quantidade
    carga.set(g.prestadorId, atual)
  }
  return carga
}

const COLACAO = new Intl.Collator('pt-BR')

/** Ordem da lista do cadastro: por nome, como o `localeCompare` do protótipo. */
export function ordenarPorNome<T extends { nome: string }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => COLACAO.compare(a.nome, b.nome))
}

/** Texto da exclusão bloqueada (modal do protótipo e 409 do DELETE). */
export function mensagemBloqueio(nome: string, emAberto: number): string {
  const acionamentos = emAberto === 1 ? 'acionamento' : 'acionamentos'
  return `${nome} tem ${emAberto} ${acionamentos} em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.`
}

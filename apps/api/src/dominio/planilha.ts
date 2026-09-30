import { ErroDominio } from './acionamento'
import {
  digitosVerificadoresValidos,
  soDigitos,
  telefoneValido,
  tipoDeDocumento,
} from './documentos'
import { emailValido } from './convites'

/**
 * Planilha de credenciados (importação e exportação), regras puras. O formato, os aliases e os
 * selos vêm do protótipo (acionamentos-data.js D98–104 e Acionamentos.dc.html H1195–1233).
 */

export const CABECALHO_PLANILHA = [
  'Nome',
  'CPF/CNPJ',
  'Telefone',
  'E-mail',
  'Região',
  'Especialidades',
  'Status',
  'Credenciado desde',
] as const

/** Larguras (`wch`) das colunas da exportação. */
export const LARGURAS_EXPORTACAO = [26, 20, 16, 30, 14, 44, 10, 16] as const

/** Linha de exemplo do modelo ("Credenciado desde" vazio). */
export const LINHA_MODELO = [
  'Nome Sobrenome',
  '000.000.000-00',
  '(11) 90000-0000',
  'email@exemplo.com',
  'Zona Oeste',
  'Vazamento; Pintura',
  'Ativo',
  '',
]

export const NOME_MODELO = 'modelo-credenciados-russo.xlsx'
export const LIMITE_LINHAS = 2000
export const TAMANHO_MAXIMO_PLANILHA = 5 * 1024 * 1024

/** O `norm` do protótipo: sem acentos, minúsculo e só letras de a a z. */
export const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

/**
 * Texto de um CSV: com BOM, UTF-8; UTF-8 válido, UTF-8; senão Windows-1252 (o CSV que o Excel em
 * pt-BR salva).
 */
export function decodificarTexto(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** `;` quando aparece mais que `,` na primeira linha (fora de aspas); senão `,`. */
export function detectarSeparador(texto: string): ',' | ';' {
  let entreAspas = false
  let virgulas = 0
  let pontosEVirgulas = 0
  for (const c of texto) {
    if (c === '"') entreAspas = !entreAspas
    else if (entreAspas) continue
    else if (c === '\n' || c === '\r') break
    else if (c === ',') virgulas++
    else if (c === ';') pontosEVirgulas++
  }
  return pontosEVirgulas > virgulas ? ';' : ','
}

/** Célula já lida da planilha (as datas do Excel chegam como "AAAA-MM-DD"). */
export type Celula = string | number | boolean | null | undefined

/** Uma linha da planilha, com os campos reconhecidos aparados ('' quando vazios). */
export interface LinhaLida {
  nome: string
  documento: string
  telefone: string
  email: string
  regiao: string
  especialidades: string
  status: string
  credenciadoDesde: string
}

export type Campo = keyof LinhaLida

/** Cabeçalhos aceitos, já normalizados (os do protótipo e "Credenciado desde"). */
const CAMPOS: Record<string, Campo> = {
  nome: 'nome',
  cpfcnpj: 'documento',
  cpf: 'documento',
  cnpj: 'documento',
  documento: 'documento',
  telefone: 'telefone',
  celular: 'telefone',
  email: 'email',
  regiao: 'regiao',
  especialidades: 'especialidades',
  servicos: 'especialidades',
  status: 'status',
  situacao: 'status',
  credenciadodesde: 'credenciadoDesde',
}

const textoDaCelula = (c: Celula): string => (c === null || c === undefined ? '' : String(c).trim())

const linhaVazia = (): LinhaLida => ({
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  regiao: '',
  especialidades: '',
  status: '',
  credenciadoDesde: '',
})

/**
 * Converte a primeira aba em linhas. O cabeçalho é a primeira linha não vazia; colunas que caem
 * no mesmo campo ficam com o primeiro valor não vazio; linhas sem nenhum campo reconhecido
 * preenchido são puladas.
 */
export function mapearTabela(
  tabela: readonly (readonly Celula[] | null | undefined)[],
): LinhaLida[] {
  return mapearTabelaComColunas(tabela).linhas
}

/** Como `mapearTabela`, dizendo também quais campos o cabeçalho trouxe (para não apagar os outros). */
export function mapearTabelaComColunas(tabela: readonly (readonly Celula[] | null | undefined)[]): {
  linhas: LinhaLida[]
  presentes: ReadonlySet<Campo>
} {
  const preenchidas = tabela.filter(
    (l): l is readonly Celula[] => !!l && l.some((c) => textoDaCelula(c) !== ''),
  )
  const [cabecalho = [], ...resto] = preenchidas
  const colunas: [number, Campo][] = []
  cabecalho.forEach((c, i) => {
    const campo = CAMPOS[normalizarTexto(textoDaCelula(c))]
    if (campo) colunas.push([i, campo])
  })
  const linhas: LinhaLida[] = []
  for (const celulas of resto) {
    const linha = linhaVazia()
    for (const [i, campo] of colunas) {
      if (!linha[campo]) linha[campo] = textoDaCelula(celulas[i])
    }
    if (Object.values(linha).some(Boolean)) linhas.push(linha)
  }
  if (!linhas.length) {
    throw new ErroDominio('planilha_vazia', 'Não encontramos linhas na planilha')
  }
  if (linhas.length > LIMITE_LINHAS) {
    throw new ErroDominio('planilha_muitas_linhas', `A planilha passa de ${LIMITE_LINHAS} linhas`)
  }
  return { linhas, presentes: new Set(colunas.map(([, campo]) => campo)) }
}

/** "Credenciado desde": DD/MM/AAAA, D/M/AAAA ou AAAA-MM-DD, com dia de calendário válido. */
export function dataDaPlanilha(texto: string): string | null {
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const partes = br ? [br[3], br[2], br[1]] : iso ? [iso[1], iso[2], iso[3]] : null
  if (!partes) return null
  const [ano, mes, dia] = partes.map(Number) as [number, number, number]
  if (ano < 1900 || ano > 2100) return null
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null
  return data.toISOString().slice(0, 10)
}

export type StatusPlanilha = 'ativo' | 'inativo'

/** Prestador não excluído, com o documento em dígitos. */
export interface PrestadorExistente {
  id: string
  nome: string
  documento: string
  status: StatusPlanilha
}

export interface TipoAtivo {
  id: string
  nome: string
}

export type AcaoLinha = 'novo' | 'atualizar' | 'erro'
export type Selo =
  | 'Novo'
  | 'Atualizar'
  | 'Sem nome'
  | 'Documento inválido'
  | 'Duplicado na planilha'
  | 'Telefone inválido'
  | 'E-mail inválido'

/** O que a conferência mostra de cada linha: os textos como vieram e o selo. */
export interface LinhaPrevia {
  nome: string
  documento: string
  especialidades: string[]
  acao: AcaoLinha
  selo: Selo
}

/**
 * O que a importação grava de uma linha válida. Campo cuja coluna não veio no cabeçalho fica
 * ausente (undefined): numa atualização, o valor gravado é mantido; num novo, valem os padrões.
 */
export interface DadosImportados {
  nome: string
  documento: string
  telefone: string
  email?: string | null
  regiao?: string | null
  /** Ids dos tipos ativos reconhecidos, na ordem da planilha e sem repetição. */
  especialidades?: string[]
  status?: StatusPlanilha
  /** AAAA-MM-DD, ou null quando a célula não é uma data válida. */
  credenciadoDesde?: string | null
}

export type Gravacao =
  | { acao: 'novo'; dados: DadosImportados }
  | { acao: 'atualizar'; id: string; dados: DadosImportados }

export interface Previa {
  linhas: LinhaPrevia[]
  resumo: { novos: number; atualizados: number; erros: number }
  /** Ativos cujo documento não está em nenhuma linha válida, na ordem de cadastro. */
  ausentes: { id: string; nome: string }[]
  gravacoes: Gravacao[]
}

/**
 * Selos na ordem do protótipo (sem nome, tamanho do documento, duplicado), mais o dígito
 * verificador nas linhas novas, o telefone com DDD e o e-mail. Só as linhas válidas contam como vistas:
 * a primeira linha válida de um documento vence.
 */
export function montarPrevia(
  lidas: readonly LinhaLida[],
  existentes: readonly PrestadorExistente[],
  tipos: readonly TipoAtivo[],
  presentes: ReadonlySet<Campo> = new Set(Object.keys(linhaVazia()) as Campo[]),
): Previa {
  const porDocumento = new Map(existentes.map((p) => [p.documento, p]))
  const tipoPorNome = new Map(tipos.map((t) => [normalizarTexto(t.nome), t.id]))
  const vistos = new Set<string>()
  /** Todo documento que apareceu na planilha, mesmo em linha rejeitada: não conta como ausente. */
  const documentosNaPlanilha = new Set<string>()
  const linhas: LinhaPrevia[] = []
  const gravacoes: Gravacao[] = []

  for (const l of lidas) {
    const documento = soDigitos(l.documento)
    if (documento) documentosNaPlanilha.add(documento)
    const telefone = soDigitos(l.telefone)
    const nomes = l.especialidades
      .split(/[;,/]/)
      .map((n) => n.trim())
      .filter(Boolean)
    const existente = porDocumento.get(documento)
    const selo: Selo = !l.nome
      ? 'Sem nome'
      : !tipoDeDocumento(documento)
        ? 'Documento inválido'
        : vistos.has(documento)
          ? 'Duplicado na planilha'
          : !existente && !digitosVerificadoresValidos(documento)
            ? 'Documento inválido'
            : !telefoneValido(telefone)
              ? 'Telefone inválido'
              : l.email.trim() && !emailValido(l.email)
                ? 'E-mail inválido'
                : existente
                  ? 'Atualizar'
                  : 'Novo'
    const acao: AcaoLinha = selo === 'Novo' ? 'novo' : selo === 'Atualizar' ? 'atualizar' : 'erro'
    linhas.push({ nome: l.nome, documento: l.documento, especialidades: nomes, acao, selo })
    if (acao === 'erro') continue

    vistos.add(documento)
    const ids = nomes
      .map((n) => tipoPorNome.get(normalizarTexto(n)))
      .filter((id): id is string => !!id)
    const dados: DadosImportados = {
      nome: l.nome,
      documento,
      telefone,
      ...(presentes.has('email') ? { email: l.email.trim() || null } : {}),
      ...(presentes.has('regiao') ? { regiao: l.regiao || null } : {}),
      ...(presentes.has('especialidades') ? { especialidades: [...new Set(ids)] } : {}),
      ...(presentes.has('status')
        ? { status: normalizarTexto(l.status).startsWith('inativ') ? 'inativo' : 'ativo' }
        : {}),
      ...(presentes.has('credenciadoDesde')
        ? { credenciadoDesde: dataDaPlanilha(l.credenciadoDesde) }
        : {}),
    }
    gravacoes.push(
      existente ? { acao: 'atualizar', id: existente.id, dados } : { acao: 'novo', dados },
    )
  }

  const contar = (a: AcaoLinha) => linhas.filter((l) => l.acao === a).length
  return {
    linhas,
    resumo: { novos: contar('novo'), atualizados: contar('atualizar'), erros: contar('erro') },
    ausentes: existentes
      .filter((p) => p.status === 'ativo' && !documentosNaPlanilha.has(p.documento))
      .map(({ id, nome }) => ({ id, nome })),
    gravacoes,
  }
}

export function formatarDocumento(digitos: string): string {
  if (/^\d{11}$/.test(digitos)) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (/^\d{14}$/.test(digitos)) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return digitos
}

export function formatarTelefone(digitos: string): string {
  if (/^\d{11}$/.test(digitos)) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (/^\d{10}$/.test(digitos)) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return digitos
}

/** Prestador como a exportação precisa: especialidades por nome, na ordem do cadastro. */
export interface PrestadorExportado {
  nome: string
  documento: string
  telefone: string
  email: string | null
  regiao: string | null
  especialidades: string[]
  status: StatusPlanilha
  /** AAAA-MM-DD */
  credenciadoDesde: string
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/')

/** As linhas da exportação (sem o cabeçalho), só com texto; vazios como ''. */
export function linhasDeExportacao(lista: readonly PrestadorExportado[]): string[][] {
  return lista.map((p) => [
    p.nome,
    formatarDocumento(p.documento),
    formatarTelefone(p.telefone),
    p.email ?? '',
    p.regiao ?? '',
    p.especialidades.join('; '),
    p.status === 'ativo' ? 'Ativo' : 'Inativo',
    dataBr(p.credenciadoDesde),
  ])
}

/** "credenciados-russo-DD-MM-AAAA.xlsx" a partir da data de hoje (AAAA-MM-DD). */
export const nomeDaExportacao = (hojeIso: string): string =>
  `credenciados-russo-${hojeIso.split('-').reverse().join('-')}.xlsx`

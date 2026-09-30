import { ErroDominio } from './acionamento'

/** Cores dos tipos novos, na ordem do protótipo (addType, Acionamentos.dc.html L1014). */
export const PALETA_TIPOS = [
  '#0069BD',
  '#FC7608',
  '#B37BE7',
  '#F47B50',
  '#FF6A5D',
  '#FFB523',
  '#363853',
  '#47C272',
] as const
export const LIMITE_NOME_TIPO = 60
export const LIMITE_CATEGORIA = 60
export const LIMITE_ETAPA = 200

/** Cor do tipo novo: a paleta pela quantidade de tipos não excluídos (as cores podem repetir). */
export function corDoNovoTipo(quantidadeAtivos: number): string {
  return PALETA_TIPOS[quantidadeAtivos % PALETA_TIPOS.length]!
}

/**
 * O nome como é gravado: sem espaços nas pontas, espaços internos repetidos viram um só
 * (a tela não distingue "Ponto  de luz" de "Ponto de luz"), obrigatório e com até 60 caracteres.
 */
export function normalizarNomeTipo(nome: string): string {
  const aparado = nome.trim().replace(/\s+/g, ' ')
  if (!aparado) throw new ErroDominio('nome_obrigatorio', 'Informe o nome do tipo')
  if (aparado.length > LIMITE_NOME_TIPO) {
    throw new ErroDominio('texto_longo', `O nome pode ter até ${LIMITE_NOME_TIPO} caracteres`)
  }
  return aparado
}

/** A categoria como é gravada: com trim e até 60 caracteres; vazia vira null (tela: "Outros"). */
export function normalizarCategoria(categoria: string | null): string | null {
  const aparada = categoria?.trim()
  if (!aparada) return null
  if (aparada.length > LIMITE_CATEGORIA) {
    throw new ErroDominio('texto_longo', `A categoria pode ter até ${LIMITE_CATEGORIA} caracteres`)
  }
  return aparada
}

/** O checklist como é gravado: etapas com trim, sem as vazias, cada uma com até 200 caracteres. */
export function normalizarChecklist(etapas: readonly string[]): string[] {
  const limpas = etapas.map((e) => e.trim()).filter(Boolean)
  if (limpas.some((e) => e.length > LIMITE_ETAPA)) {
    throw new ErroDominio('texto_longo', `Cada etapa pode ter até ${LIMITE_ETAPA} caracteres`)
  }
  return limpas
}

/** Chave para comparar nomes: sem acentos, sem maiúsculas, sem espaços repetidos nem nas pontas. */
export function chaveDoNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Recusa (409) um nome igual ao de outro tipo não excluído, sem acentos e sem maiúsculas. */
export function exigirNomeLivre(
  nome: string,
  existentes: readonly { id: string; nome: string }[],
  proprioId?: string,
): void {
  const chave = chaveDoNome(nome)
  if (existentes.some((t) => t.id !== proprioId && chaveDoNome(t.nome) === chave)) {
    throw new ErroDominio('nome_duplicado', 'Já existe um tipo com esse nome', 409)
  }
}

/** Recusa (409) excluir o último tipo ativo: o Novo acionamento precisa de pelo menos um. */
export function exigirOutroTipoAtivo(quantidadeAtivos: number): void {
  if (quantidadeAtivos <= 1) {
    throw new ErroDominio('ultimo_tipo', 'Mantenha pelo menos um tipo de demanda', 409)
  }
}

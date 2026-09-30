import { FUSO } from '@kgb/ui'

/** Textos da planilha de credenciados (protótipo H1195–1233, com o singular corrigido). */

const contar = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`

/** "2 novos · 3 atualizados · 3 com erro (serão ignorados)". */
export function resumoDaPrevia(r: { novos: number; atualizados: number; erros: number }): string {
  const partes = [
    contar(r.novos, 'novo', 'novos'),
    contar(r.atualizados, 'atualizado', 'atualizados'),
  ]
  if (r.erros) {
    partes.push(`${r.erros} com erro (${r.erros === 1 ? 'será ignorado' : 'serão ignorados'})`)
  }
  return partes.join(' · ')
}

/**
 * As especialidades de uma linha da conferência, na ordem da planilha, com as que não casam com
 * nenhum tipo ativo (a importação as ignora) marcadas como "(ignorada)".
 */
export function especialidadesDaLinha(linha: {
  especialidades: readonly string[]
  especialidadesIgnoradas?: readonly string[]
}): { texto: string; ignorada: boolean }[] {
  const ignoradas = new Set(linha.especialidadesIgnoradas)
  return linha.especialidades.map((nome) =>
    ignoradas.has(nome)
      ? { texto: `${nome} (ignorada)`, ignorada: true }
      : { texto: nome, ignorada: false },
  )
}

/** Aviso da conferência quando há novos com e-mail: a importação não manda convites. */
export const AVISO_CONVITE =
  'Os novos credenciados não recebem convite automático; envie pelo Editar de cada um.'

/** Descrição do "Desativar quem não está na planilha", com todos os nomes. */
export function textoDosAusentes(nomes: readonly string[]): string {
  const quem =
    nomes.length === 1
      ? '1 credenciado ativo não está na planilha'
      : `${nomes.length} credenciados ativos não estão na planilha`
  return `${quem}: ${nomes.join(', ')}`
}

/** "Planilha importada: 2 novos, 3 atualizados". */
export const avisoDeImportacao = (r: { novos: number; atualizados: number }): string =>
  `Planilha importada: ${contar(r.novos, 'novo', 'novos')}, ${contar(r.atualizados, 'atualizado', 'atualizados')}`

const dataDoArquivo = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "credenciados-russo-DD-MM-AAAA.xlsx", com a data de hoje em São Paulo. */
export const nomeDaExportacao = (agora: Date): string =>
  `credenciados-russo-${dataDoArquivo.format(agora).split('/').join('-')}.xlsx`

export const NOME_MODELO = 'modelo-credenciados-russo.xlsx'

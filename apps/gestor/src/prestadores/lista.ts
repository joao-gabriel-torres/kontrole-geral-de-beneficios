import type { components } from '@kgb/api-client'
import { formatarDocumento } from '@kgb/ui'

export type PrestadorCadastro = components['schemas']['PrestadorCadastro']
export type FiltroPrestadores = 'todos' | 'ativo' | 'inativo'

export const FILTROS: readonly { id: FiltroPrestadores; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'inativo', rotulo: 'Inativos' },
]

const plural = (n: number, singular: string, varios: string) => (n === 1 ? singular : varios)

/** "5 ativos de 6 credenciados" (o app corrige o "1 ativos de 1 credenciados" do protótipo). */
export function subtitulo(lista: readonly PrestadorCadastro[]): string {
  const ativos = lista.filter((p) => p.status === 'ativo').length
  return `${ativos} ${plural(ativos, 'ativo', 'ativos')} de ${lista.length} ${plural(lista.length, 'credenciado', 'credenciados')}`
}

/** Contagem de cada chip, sobre todos os prestadores (a busca não entra). */
export function contagens(lista: readonly PrestadorCadastro[]): Record<FiltroPrestadores, number> {
  const ativos = lista.filter((p) => p.status === 'ativo').length
  return { todos: lista.length, ativo: ativos, inativo: lista.length - ativos }
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * Busca da tela: nome, documento (formatado ou só dígitos), região e e-mail, ignorando acentos e
 * maiúsculas. Os campos vão seguidos, como no protótipo ("mendes318" acha o Carlos).
 */
function combina(p: PrestadorCadastro, termo: string): boolean {
  const texto = normalizar(
    `${p.nome}${formatarDocumento(p.documento)}${p.regiao ?? ''}${p.email ?? ''}`,
  )
  return texto.includes(termo) || p.documento.includes(termo)
}

/** A lista da tela: filtro de status e busca, na ordem que a API manda (por nome). */
export function filtrarPrestadores(
  lista: readonly PrestadorCadastro[],
  filtro: FiltroPrestadores,
  busca: string,
): PrestadorCadastro[] {
  const termo = normalizar(busca.trim())
  return lista.filter(
    (p) => (filtro === 'todos' || p.status === filtro) && (!termo || combina(p, termo)),
  )
}

/** "318.402.117-50 · Zona Oeste" (sem região, "—"). */
export const linhaDocumento = (p: PrestadorCadastro): string =>
  `${formatarDocumento(p.documento)} · ${p.regiao || '—'}`

/** Até 2 especialidades na linha; as outras viram "+n". */
export function chipsDaLinha(p: PrestadorCadastro): { visiveis: string[]; mais: string | null } {
  const nomes = p.especialidades.map((e) => e.nome)
  return { visiveis: nomes.slice(0, 2), mais: nomes.length > 2 ? `+${nomes.length - 2}` : null }
}

export const rotuloCarga = (p: PrestadorCadastro): string =>
  `${p.emAberto} em aberto · ${p.total} no total`

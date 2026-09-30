import type { TipoDemanda } from '@kgb/api-client'

/**
 * A busca de tipos de demanda (`BuscaTipos.vue`), usada nos tipos do Novo acionamento e nas
 * especialidades do cadastro de prestadores.
 */

/** Liga ou desliga um tipo, guardando a ordem de escolha. */
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

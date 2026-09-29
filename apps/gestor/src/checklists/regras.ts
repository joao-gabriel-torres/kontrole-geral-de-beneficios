/** Os mesmos limites da API (depois do trim): o campo não deixa passar do que ela aceita. */
export const LIMITE_NOME = 60
export const LIMITE_ETAPA = 200

/** "N itens", com o singular corrigido (o protótipo escreve "1 itens"). */
export function rotuloItens(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'itens'}`
}

/** O texto da etapa como foi digitado (o trim é da API). */
export function editarEtapa(lista: readonly string[], i: number, texto: string): string[] {
  return lista.map((etapa, j) => (j === i ? texto : etapa))
}

/** Troca a etapa com a anterior. Na primeira não há o que fazer: `null`. */
/** Leva a etapa da posição `de` para `para` (arrastar), empurrando as do meio. */
export function moverEtapa(lista: readonly string[], de: number, para: number): string[] | null {
  const fora = (i: number) => i < 0 || i >= lista.length
  if (de === para || fora(de) || fora(para)) return null
  const nova = [...lista]
  const [etapa] = nova.splice(de, 1)
  nova.splice(para, 0, etapa!)
  return nova
}

export const subirEtapa = (lista: readonly string[], i: number) => moverEtapa(lista, i, i - 1)

export const descerEtapa = (lista: readonly string[], i: number) => moverEtapa(lista, i, i + 1)

export function removerEtapa(lista: readonly string[], i: number): string[] {
  return lista.filter((_, j) => j !== i)
}

/** A etapa nova, com trim, no fim. Texto vazio não entra: `null`. */
export function acrescentarEtapa(lista: readonly string[], texto: string): string[] | null {
  const etapa = texto.trim()
  return etapa ? [...lista, etapa] : null
}

/** O tipo selecionado é o do id; se ele não existir mais, o primeiro da lista. */
export function escolherSelecionado<T extends { id: string }>(
  lista: readonly T[],
  id: string | null,
): T | null {
  return lista.find((t) => t.id === id) ?? lista[0] ?? null
}

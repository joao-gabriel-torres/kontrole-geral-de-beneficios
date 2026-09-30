const COLACAO = new Intl.Collator('pt-BR')

/** Distância entre dois CEPs de 8 dígitos: |a − b|. Heurística numérica, sem geocodificação. */
export function distanciaEntreCeps(a: string, b: string): number {
  return Math.abs(Number(a) - Number(b))
}

/**
 * Ordena prestadores pela proximidade do CEP de referência: o mais próximo primeiro, empate
 * resolvido pelo nome; quem não tem CEP vai ao fim, também por nome.
 */
export function ordenarPorProximidade<T extends { nome: string; cep: string | null }>(
  lista: readonly T[],
  cep: string,
): T[] {
  return [...lista].sort((a, b) => {
    if (a.cep === null || b.cep === null) {
      if (a.cep === b.cep) return COLACAO.compare(a.nome, b.nome)
      return a.cep === null ? 1 : -1
    }
    const distancia = distanciaEntreCeps(a.cep, cep) - distanciaEntreCeps(b.cep, cep)
    return distancia !== 0 ? distancia : COLACAO.compare(a.nome, b.nome)
  })
}

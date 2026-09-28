/** "Revisão elétrica + Troca de disjuntor". */
export function rotuloTipos(tipos: readonly { nome: string }[]): string {
  return tipos.map((t) => t.nome).join(' + ')
}

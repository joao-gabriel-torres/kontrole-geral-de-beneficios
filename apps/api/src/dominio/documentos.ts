/** Regras de documento (CPF/CNPJ), telefone e cor do cadastro de prestadores. Tudo em dígitos. */

export const soDigitos = (texto: string): string => texto.replace(/\D/g, '')

export function tipoDeDocumento(digitos: string): 'cpf' | 'cnpj' | null {
  if (!/^\d+$/.test(digitos)) return null
  return digitos.length === 11 ? 'cpf' : digitos.length === 14 ? 'cnpj' : null
}

function digito(base: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + Number(base[i]) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

const PESOS_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

/**
 * Confere os dígitos verificadores de um CPF ou CNPJ (e recusa dígitos todos iguais). Os documentos
 * do seed, vindos do protótipo, não passam: a validação vale para documento novo ou alterado.
 */
export function digitosVerificadoresValidos(digitos: string): boolean {
  const tipo = tipoDeDocumento(digitos)
  if (!tipo || /^(\d)\1+$/.test(digitos)) return false
  if (tipo === 'cpf') {
    const pesos = (n: number) => Array.from({ length: n }, (_, i) => n + 1 - i)
    const d1 = digito(digitos, pesos(9))
    const d2 = digito(digitos.slice(0, 9) + d1, pesos(10))
    return digitos.endsWith(`${d1}${d2}`)
  }
  const d1 = digito(digitos, PESOS_CNPJ.slice(1))
  const d2 = digito(digitos.slice(0, 12) + d1, PESOS_CNPJ)
  return digitos.endsWith(`${d1}${d2}`)
}

/** Telefone com DDD: 10 (fixo) ou 11 (celular) dígitos. */
export const telefoneValido = (digitos: string): boolean => /^\d{10,11}$/.test(digitos)

/** Cores dos avatares do protótipo (`PCOL`), atribuídas pela posição do cadastro. */
export const CORES_PRESTADOR = [
  '#0069BD',
  '#FC7608',
  '#5D627D',
  '#F47B50',
  '#004E8F',
  '#E0A100',
  '#8FB8DE',
  '#A6A6A6',
] as const

export const corDoPrestador = (posicao: number): string =>
  CORES_PRESTADOR[posicao % CORES_PRESTADOR.length]!

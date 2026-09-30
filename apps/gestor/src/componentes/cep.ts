import type { components } from '@kgb/api-client'

/**
 * O CEP dos formulários de endereço (outro endereço do Novo acionamento e cadastro de prestadores):
 * a máscara e o erro local. A consulta ao ViaCEP fica em `consultaCep.ts`.
 */

export type EnderecoCep = components['schemas']['EnderecoCep']

/** Só os dígitos do CEP, no máximo 8. */
export const digitosCep = (texto: string): string => texto.replace(/\D/g, '').slice(0, 8)

/** "01310200" → "01310-200", enquanto é digitado. */
export function formatarCep(texto: string): string {
  const d = digitosCep(texto)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const MENSAGEM_CEP = 'Informe um CEP com 8 dígitos'

/** O erro local do campo CEP: só para um CEP começado e incompleto. */
export function erroDoCep(texto: string): string {
  const n = digitosCep(texto).length
  return n > 0 && n < 8 ? MENSAGEM_CEP : ''
}

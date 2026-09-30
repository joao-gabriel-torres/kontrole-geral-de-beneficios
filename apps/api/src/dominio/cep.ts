import { ErroDominio } from './acionamento'

const CEP_VALIDO = /^\d{5}-?\d{3}$/

/** O CEP como é gravado e consultado: só os 8 dígitos ("01310-200" → "01310200"). */
export function normalizarCep(texto: string): string {
  const aparado = texto.trim()
  if (!CEP_VALIDO.test(aparado)) {
    throw new ErroDominio('cep_invalido', 'Informe um CEP com 8 dígitos')
  }
  return aparado.replace('-', '')
}

/** CEP opcional (prestador, acionamento): vazio vira null; informado passa pelo normalizarCep. */
export function normalizarCepOpcional(texto?: string | null): string | null {
  const aparado = texto?.trim()
  return aparado ? normalizarCep(aparado) : null
}

/**
 * Endereço de exibição no formato do protótipo: "Rua Harmonia, 410 · Vila Madalena", com o
 * complemento depois do número quando existe ("Rua Harmonia, 410, apto 52 · Vila Madalena").
 */
export function montarEndereco(p: {
  logradouro: string
  numero: string
  complemento?: string | null
  bairro: string
}): string {
  const complemento = p.complemento?.trim()
  return `${p.logradouro}, ${p.numero}${complemento ? `, ${complemento}` : ''} · ${p.bairro}`
}

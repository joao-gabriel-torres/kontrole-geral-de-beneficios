/** Formatos de exibição do cadastro de prestadores. O banco guarda só os dígitos. */

export function formatarDocumento(digitos: string): string {
  if (/^\d{11}$/.test(digitos))
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (/^\d{14}$/.test(digitos)) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return digitos
}

export function formatarTelefone(digitos: string): string {
  if (/^\d{11}$/.test(digitos)) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (/^\d{10}$/.test(digitos)) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return digitos
}

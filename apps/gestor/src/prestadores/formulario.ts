import type { components } from '@kgb/api-client'
import { formatarDocumento, formatarTelefone } from '@kgb/ui'
import type { PrestadorCadastro } from './lista'

export type DadosPrestador = components['schemas']['DadosPrestador']
export type AcessoPrestador = PrestadorCadastro['acesso']
export type ConviteAoCredenciar = components['schemas']['PrestadorCredenciado']['convite']

/** O modal Novo/Editar. Os campos são texto puro, sem máscara, como no protótipo. */
export interface FormularioPrestador {
  id: string | null
  nome: string
  documento: string
  telefone: string
  email: string
  regiao: string
  especialidades: string[]
}

export const formularioVazio = (): FormularioPrestador => ({
  id: null,
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  regiao: '',
  especialidades: [],
})

/** O Editar abre com documento e telefone formatados (o banco guarda só os dígitos). */
export const formularioDe = (p: PrestadorCadastro): FormularioPrestador => ({
  id: p.id,
  nome: p.nome,
  documento: formatarDocumento(p.documento),
  telefone: formatarTelefone(p.telefone),
  email: p.email ?? '',
  regiao: p.regiao ?? '',
  especialidades: p.especialidades.map((e) => e.id),
})

const digitos = (texto: string) => texto.replace(/\D/g, '')
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

/**
 * O primeiro erro, na ordem do protótipo. Os dígitos verificadores ficam com a API (só para
 * documento novo ou alterado): o erro dela aparece na mesma linha ao salvar.
 */
export function erroDoFormulario(
  f: FormularioPrestador,
  lista: readonly PrestadorCadastro[],
): string {
  const documento = digitos(f.documento)
  if (!f.nome.trim()) return 'Informe o nome'
  if (documento.length !== 11 && documento.length !== 14) return 'CPF ou CNPJ inválido'
  const dono = lista.find((p) => p.id !== f.id && p.documento === documento)
  if (dono) return `Documento já cadastrado para ${dono.nome}`
  const telefone = digitos(f.telefone).length
  if (telefone < 10 || telefone > 11) return 'Informe o telefone com DDD'
  // O e-mail vira o login do convite; a API confere de novo com o critério do Better Auth.
  const email = f.email.trim()
  if (email && !EMAIL.test(email)) return 'Informe um e-mail válido'
  return ''
}

/** Com o formulário vazio (ou só e-mail e região) o erro não aparece, mas o Salvar fica claro. */
export const mostrarErro = (f: FormularioPrestador, erro: string): boolean =>
  !!erro && !!(f.nome || f.documento || f.telefone)

export const alternarEspecialidade = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

export const corpoDoFormulario = (f: FormularioPrestador): DadosPrestador => ({
  nome: f.nome,
  documento: f.documento,
  telefone: f.telefone,
  email: f.email,
  regiao: f.regiao,
  especialidades: [...f.especialidades],
})

/** Códigos da API que aparecem na linha de erro do modal (os outros viram toast). */
export const ERROS_DO_FORMULARIO: ReadonlySet<string> = new Set([
  'nome_obrigatorio',
  'documento_invalido',
  'documento_duplicado',
  'telefone_invalido',
  'email_invalido',
  'tipo_invalido',
  'validacao',
])

export const tituloExclusao = (nome: string): string => `Excluir ${nome} ?`

export function textoExclusao(nome: string, emAberto: number): string {
  if (emAberto === 0) {
    return 'O histórico de acionamentos é mantido nos relatórios. Essa ação não pode ser desfeita.'
  }
  const acionamentos = emAberto === 1 ? 'acionamento' : 'acionamentos'
  return `${nome} tem ${emAberto} ${acionamentos} em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.`
}

/** O aviso depois de credenciar diz o que aconteceu com o convite de acesso ao app. */
export function avisoAoCredenciar(convite?: ConviteAoCredenciar): string {
  if (convite?.situacao === 'enviado') {
    return `Prestador credenciado. Convite enviado para ${convite.email}`
  }
  if (convite?.situacao === 'falhou') {
    return `Prestador credenciado, mas o convite não saiu: ${convite.mensagem}`
  }
  return 'Prestador credenciado'
}

/** O botão de convite do Editar: só para quem tem e-mail e ainda não criou a senha. */
export function rotuloDoConvite(acesso?: AcessoPrestador): string | null {
  if (acesso === 'pendente') return 'Enviar convite de acesso'
  if (acesso === 'convidado') return 'Reenviar convite'
  return null
}

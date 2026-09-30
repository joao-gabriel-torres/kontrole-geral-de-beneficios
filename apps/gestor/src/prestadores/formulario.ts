import type { components } from '@kgb/api-client'
import { formatarDocumento, formatarTelefone } from '@kgb/ui'
import { formatarCep, MENSAGEM_CEP, type EnderecoCep } from '../componentes/cep'
import type { PrestadorCadastro } from './lista'

export type DadosPrestador = components['schemas']['DadosPrestador']
export type AcessoPrestador = PrestadorCadastro['acesso']
export type ConviteAoCredenciar = components['schemas']['PrestadorCredenciado']['convite']

/**
 * O modal Novo/Editar. Os campos do protótipo são texto puro, sem máscara; o endereço (fora do
 * protótipo, pedido do usuário em 30/09) vem primeiro, com o CEP na máscara "00000-000".
 */
export interface FormularioPrestador {
  id: string | null
  /** Opcional: preenche o endereço e ordena os prestadores por proximidade no Novo acionamento. */
  cep: string
  /** A consulta disse que o CEP não existe (404): o Salvar fica bloqueado até corrigir. */
  cepInexistente: boolean
  /** Rua, bairro, cidade e UF vêm do CEP; número e complemento são digitados. */
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  nome: string
  documento: string
  telefone: string
  email: string
  regiao: string
  especialidades: string[]
}

export const formularioVazio = (): FormularioPrestador => ({
  id: null,
  cep: '',
  cepInexistente: false,
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  regiao: '',
  especialidades: [],
})

/**
 * O Editar abre com o endereço salvo e com documento, telefone e CEP formatados (o banco guarda só
 * os dígitos).
 */
export const formularioDe = (p: PrestadorCadastro): FormularioPrestador => ({
  id: p.id,
  cep: formatarCep(p.cep ?? ''),
  cepInexistente: false,
  logradouro: p.logradouro ?? '',
  numero: p.numero ?? '',
  complemento: p.complemento ?? '',
  bairro: p.bairro ?? '',
  cidade: p.cidade ?? '',
  uf: p.uf ?? '',
  nome: p.nome,
  documento: formatarDocumento(p.documento),
  telefone: formatarTelefone(p.telefone),
  email: p.email ?? '',
  regiao: p.regiao ?? '',
  especialidades: p.especialidades.map((e) => e.id),
})

/**
 * O CEP é consultado ao abrir só quando não há endereço salvo (o Novo, ou um CEP salvo sem rua,
 * bairro e cidade). Com o endereço salvo, o Editar só consulta quando o CEP muda.
 */
export const consultarCepAoAbrir = (f: FormularioPrestador): boolean =>
  !f.logradouro && !f.bairro && !f.cidade

type CamposDoCep = Pick<FormularioPrestador, 'logradouro' | 'bairro' | 'cidade' | 'uf'>

/** Rua, bairro, cidade e UF do CEP consultado; sem ele (incompleto, na consulta ou com falha), vazios. */
export const camposDoCep = (e: EnderecoCep | undefined): CamposDoCep => ({
  logradouro: e?.logradouro ?? '',
  bairro: e?.bairro ?? '',
  cidade: e?.cidade ?? '',
  uf: e?.uf ?? '',
})

/** "São Paulo - SP": a cidade do endereço, com a UF quando há. */
export const cidadeComUf = (cidade: string, uf: string): string =>
  [cidade, uf].filter(Boolean).join(' - ')

const digitos = (texto: string) => texto.replace(/\D/g, '')
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/
/** O mesmo formato que a API aceita: 8 dígitos, com ou sem hífen. */
const CEP = /^\d{5}-?\d{3}$/

/**
 * O primeiro erro, na ordem do formulário: o CEP, que vem primeiro, e depois os campos na ordem do
 * protótipo. Os dígitos verificadores ficam com a API (só para documento novo ou alterado): o erro
 * dela aparece na mesma linha ao salvar.
 */
export function erroDoFormulario(
  f: FormularioPrestador,
  lista: readonly PrestadorCadastro[],
): string {
  const cep = f.cep.trim()
  if (cep && !CEP.test(cep)) return MENSAGEM_CEP
  if (f.cepInexistente) return 'CEP não encontrado'
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

/**
 * Com o formulário vazio (ou só endereço, e-mail e região) o erro não aparece, mas o Salvar fica
 * claro. O CEP que não existe aparece na hora, mesmo sozinho.
 */
export const mostrarErro = (f: FormularioPrestador, erro: string): boolean =>
  !!erro && (!!(f.nome || f.documento || f.telefone) || f.cepInexistente)

export const alternarEspecialidade = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

export const corpoDoFormulario = (f: FormularioPrestador): DadosPrestador => ({
  nome: f.nome,
  documento: f.documento,
  telefone: f.telefone,
  email: f.email,
  regiao: f.regiao,
  cep: f.cep,
  logradouro: f.logradouro,
  numero: f.numero,
  complemento: f.complemento,
  bairro: f.bairro,
  cidade: f.cidade,
  uf: f.uf,
  especialidades: [...f.especialidades],
})

/** Códigos da API que aparecem na linha de erro do modal (os outros viram toast). */
export const ERROS_DO_FORMULARIO: ReadonlySet<string> = new Set([
  'nome_obrigatorio',
  'documento_invalido',
  'documento_duplicado',
  'telefone_invalido',
  'email_invalido',
  'cep_invalido',
  'uf_invalida',
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

/**
 * O botão de convite do Editar, para quem tem e-mail. Quem já criou a senha também recebe o
 * convite, que a API trata como redefinição: assim um e-mail trocado tem conserto pelo gestor.
 */
export function rotuloDoConvite(acesso?: AcessoPrestador): string | null {
  if (acesso === 'pendente') return 'Enviar convite de acesso'
  if (acesso === 'convidado') return 'Reenviar convite'
  if (acesso === 'ativo') return 'Redefinir acesso'
  return null
}

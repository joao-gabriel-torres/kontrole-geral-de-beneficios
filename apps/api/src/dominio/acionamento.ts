import type { CodigoErroConvites } from './erros-convites'
import type { CodigoErroPlanilha } from './erros-planilha'
import type { CodigoErroPrestadores } from './erros-prestadores'
import type { CodigoErroTipos } from './erros-tipos'

export type StatusAcionamento = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'aprovado'
export type Decisao = 'aprovado' | 'reprovado'

export interface Regras {
  photoMin: number
  requireAllSteps: boolean
}

export type CodigoErroDominio =
  | CodigoErroPrestadores
  | CodigoErroPlanilha
  | CodigoErroTipos
  | CodigoErroConvites
  | 'transicao_invalida'
  | 'fotos_insuficientes'
  | 'etapas_pendentes'
  | 'motivo_obrigatorio'
  | 'prestador_inativo'
  | 'tipo_invalido'
  | 'horario_invalido'
  | 'campo_obrigatorio'

export class ErroDominio extends Error {
  constructor(
    readonly codigo: CodigoErroDominio,
    mensagem: string,
    readonly status: 409 | 422 = 422,
  ) {
    super(mensagem)
    this.name = 'ErroDominio'
  }
}

/** Status de origem permitidos para cada ação (docs/design/README.md → Regras de negócio). */
export const ORIGENS = {
  iniciar: ['aberto'],
  editar: ['em_andamento', 'reprovado'],
  enviar: ['em_andamento', 'reprovado'],
  marcarInviavel: ['aberto', 'em_andamento', 'reprovado'],
  revisar: ['aguardando'],
} as const satisfies Record<string, readonly StatusAcionamento[]>

export type Acao = keyof typeof ORIGENS

const MENSAGENS_TRANSICAO: Record<Acao, string> = {
  iniciar: 'Este atendimento já foi iniciado.',
  editar: 'Só é possível alterar etapas e fotos com o atendimento em execução ou reprovado.',
  enviar: 'Este acionamento não pode ser enviado para aprovação agora.',
  marcarInviavel: 'Este acionamento não pode ser marcado como inviável agora.',
  revisar: 'Este acionamento não está aguardando aprovação.',
}

export function exigirStatus(acao: Acao, status: StatusAcionamento): void {
  if (!(ORIGENS[acao] as readonly StatusAcionamento[]).includes(status)) {
    throw new ErroDominio('transicao_invalida', MENSAGENS_TRANSICAO[acao], 409)
  }
}

export function verificarEnvio(p: {
  status: StatusAcionamento
  fotosConclusao: number
  etapas: readonly { feita: boolean }[]
  regras: Regras
}): void {
  exigirStatus('enviar', p.status)
  const faltam = p.regras.photoMin - p.fotosConclusao
  if (faltam > 0) {
    throw new ErroDominio(
      'fotos_insuficientes',
      `Adicione ${faltam} ${faltam > 1 ? 'fotos' : 'foto'} da conclusão para enviar`,
    )
  }
  if (p.regras.requireAllSteps && p.etapas.some((e) => !e.feita)) {
    throw new ErroDominio('etapas_pendentes', 'Conclua todas as etapas para enviar')
  }
}

export function verificarInviabilidade(p: {
  status: StatusAcionamento
  comentario: string
  fotos: number
}): string {
  exigirStatus('marcarInviavel', p.status)
  const comentario = p.comentario.trim()
  if (!comentario) throw new ErroDominio('motivo_obrigatorio', 'Explique o motivo da inviabilidade')
  if (p.fotos < 1) throw new ErroDominio('fotos_insuficientes', 'Registre pelo menos 1 foto')
  return comentario
}

export function verificarRevisao(p: {
  status: StatusAcionamento
  decisao: Decisao
  motivo?: string | null
}): string | null {
  exigirStatus('revisar', p.status)
  const motivo = p.motivo?.trim() || null
  if (p.decisao === 'reprovado' && !motivo) {
    throw new ErroDominio('motivo_obrigatorio', 'Escreva o motivo da reprovação')
  }
  return motivo
}

export interface DadosNovoAcionamento {
  titulo: string
  cliente: string
  endereco: string
  data: string
  inicio: string
  fim: string
  tipoIds: string[]
  prestadorId: string
}

export function normalizarNovoAcionamento(d: DadosNovoAcionamento): DadosNovoAcionamento {
  const texto = (valor: string, nome: string) => {
    const aparado = valor.trim()
    if (!aparado) throw new ErroDominio('campo_obrigatorio', `Informe ${nome}`)
    return aparado
  }
  const titulo = texto(d.titulo, 'o título')
  const cliente = texto(d.cliente, 'o cliente')
  const endereco = texto(d.endereco, 'o endereço')
  if (d.tipoIds.length === 0) {
    throw new ErroDominio('tipo_invalido', 'Escolha pelo menos um tipo de demanda')
  }
  if (!(d.inicio < d.fim))
    throw new ErroDominio('horario_invalido', 'O início precisa ser antes do fim')
  return { ...d, titulo, cliente, endereco, tipoIds: [...new Set(d.tipoIds)] }
}

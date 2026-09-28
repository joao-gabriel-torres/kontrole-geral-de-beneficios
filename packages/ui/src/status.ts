export type StatusAcionamento = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'aprovado'

export interface EstiloStatus {
  rotulo: string
  fundo: string
  texto: string
}

export const ESTILOS_STATUS: Record<StatusAcionamento | 'inviavel', EstiloStatus> = {
  aberto: { rotulo: 'Agendado', fundo: '#EFF1F3', texto: '#363853' },
  em_andamento: { rotulo: 'Em execução', fundo: '#E6F0FA', texto: '#004E8F' },
  aguardando: { rotulo: 'Aguardando aprovação', fundo: '#FFEBDC', texto: '#B85200' },
  reprovado: { rotulo: 'Reprovado', fundo: '#FFD7D4', texto: '#B8342A' },
  aprovado: { rotulo: 'Aprovado', fundo: '#E7F8F1', texto: '#0B8C61' },
  inviavel: { rotulo: 'Inviável', fundo: '#F4D8E8', texto: '#A8336A' },
}

export function estiloStatus(status: StatusAcionamento, inviavel = false): EstiloStatus {
  if (status === 'aprovado' && inviavel) return ESTILOS_STATUS.inviavel
  if (status === 'aguardando' && inviavel) {
    return { ...ESTILOS_STATUS.aguardando, rotulo: 'Inviabilidade em análise' }
  }
  return ESTILOS_STATUS[status]
}

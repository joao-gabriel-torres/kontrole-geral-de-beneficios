import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

type Evento = DetalheAcionamento['eventos'][number]

export interface ItemHistorico {
  titulo: string
  quando: string
  nota: string | null
  cor: string
}

export const CORES_HISTORICO = {
  aprovado: '#0069BD',
  reprovado: '#FF6A5D',
  neutro: '#ADB3BC',
} as const

/** Desempate para eventos no mesmo instante (ex.: inviável sem ter iniciado). */
const ORDEM: Record<Evento['tipo'], number> = {
  criado: 0,
  iniciado: 1,
  enviado: 2,
  inviabilidade_enviada: 2,
  aprovado: 3,
  reprovado: 3,
}

function comparar(a: Evento, b: Evento): number {
  if (a.em !== b.em) return a.em < b.em ? -1 : 1
  return ORDEM[a.tipo] - ORDEM[b.tipo]
}

/**
 * Eventos da API → histórico do Detalhe, com os rótulos do protótipo. Envio e inviabilidade contam
 * juntos: depois do primeiro, todo envio é "Reenviado para aprovação".
 */
export function montarLinhaDoTempo(eventos: readonly Evento[]): ItemHistorico[] {
  let envios = 0
  return [...eventos].sort(comparar).map((e) => {
    const item = (titulo: string, cor: string = CORES_HISTORICO.neutro): ItemHistorico => ({
      titulo,
      quando: momento(e.em),
      nota: e.motivo || null,
      cor,
    })
    switch (e.tipo) {
      case 'criado':
        return item('Acionamento criado')
      case 'iniciado':
        return item('Atendimento iniciado')
      case 'enviado':
        return item(envios++ ? 'Reenviado para aprovação' : 'Enviado para aprovação')
      case 'inviabilidade_enviada':
        envios++
        return item('Inviabilidade enviada')
      case 'aprovado':
        return item('Aprovado', CORES_HISTORICO.aprovado)
      case 'reprovado':
        return item('Reprovado', CORES_HISTORICO.reprovado)
    }
  })
}

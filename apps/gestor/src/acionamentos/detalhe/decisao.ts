import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

export type Decisao = 'aprovado' | 'reprovado'

export const MENSAGENS_REVISAO = {
  aprovado: 'Conclusão aprovada',
  reprovado: 'Devolvido ao prestador para correção',
  semMotivo: 'Escreva o motivo da reprovação',
} as const

export function rotulosDecisao(inviavel: boolean): {
  titulo: string
  aprovar: string
  reprovar: string
} {
  return inviavel
    ? {
        titulo: 'O prestador marcou como inviável',
        aprovar: 'Confirmar inviabilidade',
        reprovar: 'Recusar inviabilidade',
      }
    : { titulo: 'Confira e decida', aprovar: 'Aprovar conclusão', reprovar: 'Reprovar' }
}

export type PedidoRevisao =
  { ok: true; corpo: { decisao: Decisao; motivo?: string } } | { ok: false; mensagem: string }

/** Reprovar exige motivo; a observação de uma aprovação vai junto quando existe. */
export function prepararRevisao(decisao: Decisao, observacao: string): PedidoRevisao {
  const motivo = observacao.trim()
  if (decisao === 'reprovado' && !motivo) {
    return { ok: false, mensagem: MENSAGENS_REVISAO.semMotivo }
  }
  return { ok: true, corpo: motivo ? { decisao, motivo } : { decisao } }
}

/** Cartão "Última decisão": só quando não está aguardando e já houve revisão. */
export function ultimaDecisao(
  a: Pick<DetalheAcionamento, 'status' | 'revisoes'>,
): { rotulo: string; motivo: string | null } | null {
  const ultima = a.revisoes.at(-1)
  if (!ultima || a.status === 'aguardando') return null
  const verbo = ultima.decisao === 'aprovado' ? 'Aprovado' : 'Reprovado'
  return { rotulo: `${verbo} em ${momento(ultima.em)}`, motivo: ultima.motivo || null }
}

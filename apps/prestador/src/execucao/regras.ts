import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

/** Regras de tela do Detalhe, iguais às de `vPDetail` no protótipo. A API confere de novo. */

type Status = DetalheAcionamento['status']

/** Máximo de fotos que a API aceita no envio da inviabilidade. */
export const MAXIMO_FOTOS_INVIAVEL = 5

export function podeEditar(status: Status): boolean {
  return status === 'em_andamento' || status === 'reprovado'
}

const fotos = (n: number) => `${n} ${n > 1 ? 'fotos' : 'foto'}`

export function avaliarEnvio(p: {
  regras: DetalheAcionamento['regras']
  fotosConclusao: number
  etapas: { feitas: number; total: number }
}): { pode: boolean; falta: string | null } {
  const faltam = p.regras.photoMin - p.fotosConclusao
  const falta =
    faltam > 0
      ? `Adicione ${fotos(faltam)} da conclusão para enviar`
      : p.regras.requireAllSteps && p.etapas.feitas < p.etapas.total
        ? 'Conclua todas as etapas para enviar'
        : null
  return { pode: falta === null, falta }
}

/** Linha azul da etapa: "2 fotos · comentário". */
export function resumoEtapa(quantidadeFotos: number, comentario: string | null): string {
  return [quantidadeFotos ? fotos(quantidadeFotos) : '', comentario ? 'comentário' : '']
    .filter(Boolean)
    .join(' · ')
}

export function textoFotosObrigatorias(n: number): string {
  return `${n} ${n > 1 ? 'fotos obrigatórias' : 'foto obrigatória'}`
}

export type Faixa =
  | { tipo: 'reprovado'; motivo: string }
  | { tipo: 'aguardando'; titulo: string; quando: string }
  | { tipo: 'aprovado'; titulo: string }

export function faixaDoStatus(d: DetalheAcionamento): Faixa | null {
  if (d.status === 'reprovado') {
    const ultima = d.revisoes.at(-1)
    return {
      tipo: 'reprovado',
      motivo: ultima?.decisao === 'reprovado' ? (ultima.motivo ?? '') : '',
    }
  }
  if (d.status === 'aguardando') {
    return {
      tipo: 'aguardando',
      titulo: d.inviavel ? 'Inviabilidade enviada para análise' : 'Enviado para aprovação',
      quando: d.ultimoEnvioEm ? momento(d.ultimoEnvioEm) : '',
    }
  }
  if (d.status === 'aprovado') {
    return {
      tipo: 'aprovado',
      titulo: d.inviavel ? 'Inviabilidade confirmada pelo gestor' : 'Serviço aprovado pelo gestor',
    }
  }
  return null
}

export function mostrarConclusao(d: DetalheAcionamento): boolean {
  return podeEditar(d.status) || d.fotosConclusao.length > 0 || !!d.comentarioConclusao
}

export function validarInviabilidade(p: { comentario: string; fotos: number }): boolean {
  return p.comentario.trim().length > 0 && p.fotos >= 1 && p.fotos <= MAXIMO_FOTOS_INVIAVEL
}

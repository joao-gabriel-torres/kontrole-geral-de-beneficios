import type { ResumoAcionamento } from '@kgb/api-client'
import { diaMes } from '@kgb/ui'

/** Hoje e os 6 dias seguintes, como `days` em `vPro` no protótipo. */
export const DIAS_NA_FAIXA = 7

const CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
const COMPLETOS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

export interface DiaDaFaixa {
  /** "YYYY-MM-DD" no fuso de São Paulo. */
  data: string
  /** "Qua" */
  diaSemana: string
  /** "30", "1": sem zero à esquerda e sem o mês. */
  numero: string
}

export interface DiaDaAgenda extends DiaDaFaixa {
  selecionado: boolean
  temAtendimento: boolean
}

/** As datas já estão no fuso de São Paulo: as contas usam UTC para não depender do fuso do aparelho. */
function emUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(Date.UTC(ano!, mes! - 1, dia!))
}

export function somarDias(iso: string, n: number): string {
  const d = emUTC(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function faixaDeDias(hoje: string): DiaDaFaixa[] {
  return Array.from({ length: DIAS_NA_FAIXA }, (_, i) => {
    const data = somarDias(hoje, i)
    const d = emUTC(data)
    return { data, diaSemana: CURTOS[d.getUTCDay()]!, numero: String(d.getUTCDate()) }
  })
}

export function naFaixa(data: string, hoje: string): boolean {
  return data >= hoje && data <= somarDias(hoje, DIAS_NA_FAIXA - 1)
}

/** "Hoje, 29/09", "Amanhã, 30/09" ou "Quinta-feira, 01/10" (`aLabel` no protótipo). */
export function rotuloDoDia(data: string, hoje: string): string {
  const nome =
    data === hoje
      ? 'Hoje'
      : data === somarDias(hoje, 1)
        ? 'Amanhã'
        : COMPLETOS[emUTC(data).getUTCDay()]!
  return `${nome}, ${diaMes(data)}`
}

/** Os acionamentos do dia, por início; no mesmo horário, pelo código (ordem de criação). */
export function doDia<T extends Pick<ResumoAcionamento, 'data' | 'inicio' | 'codigo'>>(
  lista: readonly T[],
  data: string,
): T[] {
  return lista
    .filter((a) => a.data === data)
    .sort(
      (a, b) =>
        a.inicio.localeCompare(b.inicio) ||
        a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }),
    )
}

/** Dias com pelo menos um acionamento, de qualquer status (o ponto da faixa). */
export function datasComAtendimento(
  lista: readonly Pick<ResumoAcionamento, 'data'>[],
): Set<string> {
  return new Set(lista.map((a) => a.data))
}

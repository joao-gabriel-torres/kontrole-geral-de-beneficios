import type { ResumoAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'

/** Quem espera há mais tempo aparece primeiro (como no protótipo). Sem envio registrado, no fim. */
export function ordenarFila(lista: readonly ResumoAcionamento[]): ResumoAcionamento[] {
  const chave = (a: ResumoAcionamento) => a.ultimoEnvioEm ?? '￿'
  return [...lista].sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0))
}

/** "Enviado 27/09 · 10:30". */
export function enviadoEm(a: Pick<ResumoAcionamento, 'ultimoEnvioEm'>): string {
  return a.ultimoEnvioEm ? `Enviado ${momento(a.ultimoEnvioEm)}` : ''
}

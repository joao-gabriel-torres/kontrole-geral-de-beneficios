import { describe, expect, it } from 'vitest'
import { resumo } from '../../test/fixtures'
import { enviadoEm, ordenarFila } from './fila'

describe('fila de aprovação', () => {
  it('quem espera há mais tempo vem primeiro; sem envio vai para o fim', () => {
    const fila = ordenarFila([
      resumo({ id: 'hoje', ultimoEnvioEm: '2026-09-28T11:45:00.000Z' }),
      resumo({ id: 'sem', ultimoEnvioEm: null }),
      resumo({ id: 'ontem', ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }),
    ])
    expect(fila.map((a) => a.id)).toEqual(['ontem', 'hoje', 'sem'])
  })
  it('mostra quando foi enviado, no fuso de São Paulo', () => {
    expect(enviadoEm(resumo({ ultimoEnvioEm: '2026-09-27T13:30:00.000Z' }))).toBe(
      'Enviado 27/09 · 10:30',
    )
    expect(enviadoEm(resumo({ ultimoEnvioEm: null }))).toBe('')
  })
})

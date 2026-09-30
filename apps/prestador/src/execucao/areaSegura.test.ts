import { describe, expect, it } from 'vitest'
import barraAcoes from './BarraAcoes.vue?raw'
import painelInviavel from './PainelInviavel.vue?raw'

/**
 * O jsdom não aplica o CSS dos componentes, então a regra é conferida na fonte. No navegador
 * `env(safe-area-inset-bottom)` vale 0 (o `pnpm visual` confere o pixel); no iPhone com barra de
 * gestos, soma a altura do indicador de início ao espaço do protótipo.
 */
function declaracoes(fonte: string, seletor: string): string {
  const estilo = fonte.slice(fonte.indexOf('<style'))
  const inicio = estilo.indexOf(`\n${seletor} {`)
  if (inicio < 0) throw new Error(`Regra ${seletor} não encontrada`)
  return estilo.slice(inicio, estilo.indexOf('}', inicio))
}

describe('área segura do iPhone', () => {
  it('a barra de ações soma a área segura de baixo aos 24px do protótipo', () => {
    expect(declaracoes(barraAcoes, '.barra-acoes')).toContain(
      'padding: 12px 24px calc(24px + env(safe-area-inset-bottom));',
    )
  })

  it('o painel "Marcar como inviável" soma a área segura de baixo aos 28px do protótipo', () => {
    expect(declaracoes(painelInviavel, '.painel')).toContain(
      'padding: 12px 24px calc(28px + env(safe-area-inset-bottom));',
    )
  })
})

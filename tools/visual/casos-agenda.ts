import { telaPrestador as tela } from './regioes'
import type { Caso, Passo } from './tipos'

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Botão do dia `i` da faixa ("Qua 30"), calculado quando o harness roda, no mesmo relógio do
 * protótipo (`addD`, data local). Rode `pnpm db:seed` e `pnpm visual` no fuso de São Paulo.
 */
const dia = (i: number): Passo => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + i)
  return { clicar: `${DIAS_CURTOS[d.getDay()]} ${d.getDate()}` }
}

const agenda = (nome: string, passos: Passo[] = []): Caso => ({
  nome,
  modo: 'pa',
  navegarPrototipo: 'Agenda',
  app: 'prestador',
  rota: '/agenda',
  passos,
  regioes: [tela],
})

/** Agenda do prestador. Roda antes dos casos do prestador que gravam no banco. */
export const CASOS_AGENDA: Caso[] = [
  // Hoje: 3 cartões com linhas quebradas, pontos nos 3 primeiros dias.
  agenda('prestador-agenda'),
  agenda('prestador-agenda-amanha', [dia(1)]),
  // Nome completo do dia no rótulo ("Quinta-feira, 01/10").
  agenda('prestador-agenda-dia-semana', [dia(2)]),
  agenda('prestador-agenda-dia-livre', [dia(3)]),
  // Última coluna da grade, em posição fracionária.
  agenda('prestador-agenda-ultimo-dia', [dia(6)]),
  // O atalho "Agenda" do Início volta com o mesmo dia escolhido. No app as abas são links.
  agenda('prestador-agenda-volta-do-inicio', [
    dia(1),
    { clicar: 'Início', papel: 'text' },
    { clicar: 'Agenda' },
  ]),
  // O cartão abre o Detalhe.
  agenda('prestador-agenda-abre-detalhe', [
    dia(1),
    { clicar: 'Pintura e reparo em gesso', papel: 'text' },
  ]),
]

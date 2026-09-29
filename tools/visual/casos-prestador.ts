import { telaPrestador as tela } from './regioes'
import type { Caso, Passo } from './tipos'

/** Os chips de Demandas têm o nome acessível "rótulo + contagem" ("Corrigir 1"): casa pelo início. */
const chip = (nome: string): Passo => ({ clicar: nome, inicio: true })
const titulo = (texto: string): Passo => ({ clicar: texto, papel: 'text' })

/** Toasts ficam fora da comparação: espera o de 2,6 s sumir nos dois lados. */
const esperarToast: Passo = { esperar: 3000 }

const demandas = (nome: string, passos: Passo[] = []): Caso => ({
  nome,
  modo: 'pa',
  navegarPrototipo: 'Demandas',
  app: 'prestador',
  rota: '/demandas',
  passos,
  regioes: [tela],
})

export const CASOS_PRESTADOR: Caso[] = [
  {
    nome: 'prestador-inicio',
    modo: 'pa',
    app: 'prestador',
    rota: '/inicio',
    regioes: [tela],
  },
  demandas('prestador-demandas-ativas'),
  demandas('prestador-demandas-corrigir', [chip('Corrigir')]),
  demandas('prestador-demandas-analise', [chip('Em análise')]),
  demandas('prestador-demandas-finalizadas', [chip('Finalizadas')]),
  demandas('prestador-detalhe-aberto', [titulo('Vazamento no teto do banheiro')]),
  demandas('prestador-detalhe-reprovado', [chip('Corrigir'), titulo('Reparo em gesso no quarto')]),
  demandas('prestador-detalhe-reprovado-etapa', [
    chip('Corrigir'),
    titulo('Reparo em gesso no quarto'),
    titulo('Remover parte danificada'),
  ]),
  demandas('prestador-detalhe-aguardando', [
    chip('Em análise'),
    titulo('Limpeza de ar-condicionado'),
  ]),
  demandas('prestador-detalhe-aprovado', [
    chip('Finalizadas'),
    titulo('Troca de fechadura da porta dos fundos'),
  ]),
  demandas('prestador-inviavel', [
    titulo('Vazamento no teto do banheiro'),
    { clicar: 'Marcar como inviável' },
  ]),
  // Por último: "Iniciar atendimento" grava no banco (rode `pnpm db:seed` antes de cada rodada).
  demandas('prestador-detalhe-em-andamento', [
    titulo('Vazamento no teto do banheiro'),
    { clicar: 'Iniciar atendimento' },
    titulo('Localizar ponto do vazamento'),
    esperarToast,
  ]),
]

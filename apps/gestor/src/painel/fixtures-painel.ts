import type { components } from '@kgb/api-client'

type PainelGestor = components['schemas']['PainelGestor']

/** Resposta de GET /api/painel com o seed do protótipo, 7 dias, hoje = terça 29/09/2026 (testes). */
export function painelDoSeed(dados: Partial<PainelGestor> = {}): PainelGestor {
  const volume = [
    [2, 2],
    [2, 1],
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 0],
    [4, 0],
  ] as const
  return {
    hoje: '2026-09-29',
    periodo: 7,
    emAberto: 10,
    paraHoje: 4,
    aguardando: 3,
    aprovacao: { aprovadas: 8, total: 11 },
    tempoMedioMin: 106.15384615384616,
    inviaveis: { quantidade: 1, totalPeriodo: 16 },
    volume: volume.map(([total, aprovados], i) => ({
      data: `2026-09-${23 + i}`,
      total,
      aprovados,
    })),
    reprovacoesPorTipo: [
      { tipoNome: 'Reparo em gesso', reprovacoes: 2, demandas: 3 },
      { tipoNome: 'Revisão elétrica', reprovacoes: 1, demandas: 3 },
    ],
    ranking: [
      ['p1', 'Carlos Mendes', '#0069BD', 3, 4, 5, 69.28571428571429],
      ['p2', 'Ana Ribeiro', '#FC7608', 2, 2, 2, 200],
      ['p3', 'João Pires', '#5D627D', 1, 1, 2, 82.5],
      ['p4', 'Marina Costa', '#F47B50', 1, 1, 2, 130],
      ['p6', 'Luciana Prado', '#E0A100', 0, 0, 0, null],
    ].map(([id, nome, cor, concluidos, aprovadas, total, tempoMedioMin]) => ({
      prestador: { id: id as string, nome: nome as string, cor: cor as string },
      concluidos: concluidos as number,
      revisoes: { aprovadas: aprovadas as number, total: total as number },
      tempoMedioMin: tempoMedioMin as number | null,
    })),
    ...dados,
  }
}

import type { DetalheAcionamento, Foto } from '@kgb/api-client'

/** Detalhe de exemplo para os testes, no formato da API. */
export function detalheExemplo(extra: Partial<DetalheAcionamento> = {}): DetalheAcionamento {
  return {
    id: 'a1',
    codigo: 'AC-1063',
    titulo: 'Vazamento no teto do banheiro',
    cliente: 'Edifício Aurora',
    endereco: 'Rua Bela Cintra, 1200 · Consolação',
    data: '2026-09-28',
    inicio: '10:30',
    fim: '12:30',
    status: 'aberto',
    inviavel: false,
    prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
    tipos: [
      { nome: 'Vazamento', cor: '#0069BD' },
      { nome: 'Reparo em gesso', cor: '#E0A100' },
    ],
    etapas: { feitas: 1, total: 3 },
    ultimoEnvioEm: null,
    latitude: null,
    longitude: null,
    criadoEm: '2026-09-26T19:20:00.000Z',
    iniciadoEm: null,
    comentarioConclusao: null,
    regras: { photoMin: 1, requireAllSteps: false },
    demandas: [
      {
        id: 'd1',
        tipoNome: 'Vazamento',
        cor: '#0069BD',
        etapas: [
          {
            id: 'e1',
            texto: 'Localizar o ponto do vazamento',
            feita: true,
            comentario: null,
            fotos: [],
          },
          { id: 'e2', texto: 'Trocar a vedação', feita: false, comentario: null, fotos: [] },
        ],
      },
      {
        id: 'd2',
        tipoNome: 'Reparo em gesso',
        cor: '#E0A100',
        etapas: [{ id: 'e3', texto: 'Retocar pintura', feita: false, comentario: null, fotos: [] }],
      },
    ],
    fotosConclusao: [],
    inviabilidade: null,
    revisoes: [],
    eventos: [],
    ...extra,
  }
}

export function fotoExemplo(id: string, extra: Partial<Foto> = {}): Foto {
  return {
    id,
    url: null,
    cor: '#8E9AAF',
    horario: '10:45',
    tiradaEm: '2026-09-28T13:45:00Z',
    ...extra,
  }
}

/** Troca as etapas de uma demanda do exemplo. */
export function comEtapas(
  d: DetalheAcionamento,
  demanda: number,
  etapas: DetalheAcionamento['demandas'][number]['etapas'],
): DetalheAcionamento {
  const demandas = d.demandas.map((dm, i) => (i === demanda ? { ...dm, etapas } : dm))
  return { ...d, demandas }
}

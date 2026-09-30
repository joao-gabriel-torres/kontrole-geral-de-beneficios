import type {
  components,
  ContagemAcionamentos,
  DetalheAcionamento,
  Foto,
  PrestadorOpcao,
  ResumoAcionamento,
  TipoDemanda,
} from '@kgb/api-client'

export function resumo(dados: Partial<ResumoAcionamento> = {}): ResumoAcionamento {
  return {
    id: 'a1059',
    codigo: 'AC-1059',
    titulo: 'Revisão elétrica e troca de disjuntor',
    cliente: 'Colégio Aprender',
    endereco: 'Rua Apinajés, 1500 · Perdizes',
    data: '2026-09-27',
    inicio: '08:00',
    fim: '11:00',
    status: 'aguardando',
    inviavel: false,
    prestador: { id: 'p1', nome: 'Carlos Mendes', cor: '#0069BD' },
    tipos: [
      { nome: 'Revisão elétrica', cor: '#FC7608' },
      { nome: 'Troca de disjuntor', cor: '#F47B50' },
    ],
    etapas: { feitas: 7, total: 10 },
    ultimoEnvioEm: '2026-09-27T13:30:00.000Z',
    ...dados,
  }
}

export function foto(dados: Partial<Foto> = {}): Foto {
  return {
    id: 'f1',
    url: null,
    cor: '#9CA88A',
    horario: '08:15',
    tiradaEm: '2026-09-27T11:15:00.000Z',
    ...dados,
  }
}

export function detalhe(dados: Partial<DetalheAcionamento> = {}): DetalheAcionamento {
  return {
    ...resumo(),
    criadoEm: '2026-09-25T19:20:00.000Z',
    iniciadoEm: '2026-09-27T11:00:00.000Z',
    comentarioConclusao: 'Serviço finalizado e testado junto com o cliente.',
    regras: { photoMin: 1, requireAllSteps: false },
    demandas: [
      {
        id: 'd1',
        tipoNome: 'Revisão elétrica',
        cor: '#FC7608',
        etapas: [
          {
            id: 'e1',
            texto: 'Inspecionar quadro de distribuição',
            feita: true,
            comentario: null,
            fotos: [foto()],
          },
          {
            id: 'e2',
            texto: 'Medir tensão das tomadas',
            feita: false,
            comentario: 'Tomada da cozinha sem tensão',
            fotos: [],
          },
        ],
      },
    ],
    fotosConclusao: [foto({ id: 'f2', horario: '10:24' }), foto({ id: 'f3', horario: '10:28' })],
    inviabilidade: null,
    revisoes: [],
    eventos: [
      { tipo: 'criado', em: '2026-09-25T19:20:00.000Z', motivo: null },
      { tipo: 'iniciado', em: '2026-09-27T11:00:00.000Z', motivo: null },
      { tipo: 'enviado', em: '2026-09-27T13:30:00.000Z', motivo: null },
    ],
    ...dados,
  }
}

export function contagem(dados: Partial<ContagemAcionamentos> = {}): ContagemAcionamentos {
  return { aberto: 7, em_andamento: 1, aguardando: 3, reprovado: 2, aprovado: 57, ...dados }
}

export const TIPOS: TipoDemanda[] = [
  {
    id: 't1',
    nome: 'Vazamento',
    cor: '#0069BD',
    categoria: 'Hidráulica',
    checklist: [
      'Localizar ponto do vazamento',
      'Fechar registro e isolar a área',
      'Substituir conexão ou vedação',
      'Testar com registro aberto',
      'Limpar área de trabalho',
    ],
  },
  {
    id: 't2',
    nome: 'Revisão elétrica',
    cor: '#FC7608',
    categoria: 'Elétrica',
    checklist: ['Inspecionar quadro de distribuição', 'Medir tensão das tomadas'],
  },
  {
    id: 't6',
    nome: 'Reparo em gesso',
    cor: '#E0A100',
    categoria: 'Acabamento',
    checklist: [
      'Remover parte danificada',
      'Aplicar placa ou massa nova',
      'Lixar e nivelar',
      'Retocar pintura',
    ],
  },
  {
    id: 't9',
    nome: 'Vistoria',
    cor: '#5D627D',
    categoria: null,
    checklist: ['Fotografar a fachada'],
  },
]

export const PRESTADORES: PrestadorOpcao[] = [
  { id: 'p2', nome: 'Ana Ribeiro', regiao: 'Zona Sul', cep: '04010000', cor: '#FC7608' },
  { id: 'p1', nome: 'Carlos Mendes', regiao: 'Zona Oeste', cep: '05422001', cor: '#0069BD' },
  { id: 'p7', nome: 'Pedro Lima', regiao: null, cep: null, cor: '#5D627D' },
]

type Assinante = components['schemas']['Assinante']

const assinante = (
  id: string,
  nome: string,
  cep: string,
  logradouro: string,
  numero: string,
  bairro: string,
): Assinante => ({
  id,
  nome,
  cep,
  logradouro,
  numero,
  complemento: null,
  bairro,
  cidade: 'São Paulo',
  endereco: `${logradouro}, ${numero} · ${bairro}`,
})

/** Assinantes ativos, na ordem da busca da API (por nome). */
export const ASSINANTES: Assinante[] = [
  assinante('a2', 'Clínica Vida', '01310200', 'Av. Paulista', '1578', 'Bela Vista'),
  assinante('a1', 'Edifício Aurora', '05433000', 'Rua Harmonia', '410', 'Vila Madalena'),
  assinante('a3', 'Hotel Ipê', '01307001', 'Rua Frei Caneca', '569', 'Consolação'),
]

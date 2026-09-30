import type { components } from '@kgb/api-client'

type PrestadorCadastro = components['schemas']['PrestadorCadastro']
type TipoDemanda = components['schemas']['TipoDemanda']
type PreviaPlanilha = components['schemas']['PreviaPlanilha']

/** Dados de teste da tela de Prestadores (o seed do dia, no formato da API). */

const tipo = (id: string, nome: string, cor: string, categoria: string): TipoDemanda => ({
  id,
  nome,
  cor,
  categoria,
  checklist: [],
})

export const TIPOS_SEED: TipoDemanda[] = [
  tipo('t1', 'Vazamento', '#0069BD', 'Hidráulica'),
  tipo('t2', 'Revisão elétrica', '#FC7608', 'Elétrica'),
  tipo('t3', 'Ponto de luz', '#5D627D', 'Elétrica'),
  tipo('t4', 'Troca de disjuntor', '#F47B50', 'Elétrica'),
  tipo('t5', 'Pintura', '#004E8F', 'Acabamento'),
  tipo('t6', 'Reparo em gesso', '#E0A100', 'Acabamento'),
  tipo('t7', 'Limpeza de ar-condicionado', '#8FB8DE', 'Climatização'),
  tipo('t8', 'Chaveiro', '#A6A6A6', 'Segurança'),
]

const especialidades = (...ids: string[]) =>
  ids.map((id) => {
    const t = TIPOS_SEED.find((x) => x.id === id)!
    return { id: t.id, nome: t.nome }
  })

export function prestador(dados: Partial<PrestadorCadastro> = {}): PrestadorCadastro {
  return {
    id: 'p1',
    nome: 'Carlos Mendes',
    documento: '31840211750',
    telefone: '11987342210',
    email: 'carlos.mendes@email.com',
    regiao: 'Zona Oeste',
    cep: '05422001',
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    uf: null,
    status: 'ativo',
    cor: '#0069BD',
    credenciadoDesde: '2024-03-12',
    especialidades: especialidades('t1', 't2', 't3', 't4'),
    emAberto: 8,
    total: 20,
    acesso: 'ativo',
    ...dados,
  }
}

/** Os 6 do seed, na ordem da API (por nome). */
export const SEED_PRESTADORES: PrestadorCadastro[] = [
  prestador({
    id: 'p2',
    nome: 'Ana Ribeiro',
    documento: '27415903000144',
    telefone: '11971205588',
    email: 'ana@ribeiroreparos.com.br',
    regiao: 'Zona Sul',
    cep: '04010000',
    cor: '#FC7608',
    credenciadoDesde: '2024-06-03',
    especialidades: especialidades('t5', 't6', 't7'),
    emAberto: 2,
    total: 17,
  }),
  prestador(),
  prestador({
    id: 'p3',
    nome: 'João Pires',
    documento: '40211896531',
    telefone: '11994021876',
    email: 'joao.pires@email.com',
    regiao: 'Centro',
    cep: '01001000',
    cor: '#5D627D',
    credenciadoDesde: '2024-09-20',
    especialidades: especialidades('t1', 't2', 't4', 't8'),
    emAberto: 2,
    total: 18,
  }),
  prestador({
    id: 'p6',
    nome: 'Luciana Prado',
    documento: '41206557000190',
    telefone: '11955127780',
    email: 'luciana.prado@email.com',
    regiao: 'Zona Leste',
    cep: '03071000',
    cor: '#E0A100',
    credenciadoDesde: '2026-08-27',
    especialidades: especialidades('t6', 't5'),
    emAberto: 0,
    total: 0,
  }),
  prestador({
    id: 'p4',
    nome: 'Marina Costa',
    documento: '35882610000107',
    telefone: '11988513302',
    email: 'contato@marinacosta.com.br',
    regiao: 'Zona Oeste',
    cep: '05018000',
    cor: '#F47B50',
    credenciadoDesde: '2025-01-15',
    especialidades: especialidades('t2', 't3', 't7'),
    emAberto: 1,
    total: 15,
  }),
  prestador({
    id: 'p5',
    nome: 'Roberto Alves',
    documento: '21977438012',
    telefone: '11966770914',
    email: 'roberto.alves@email.com',
    regiao: 'Zona Norte',
    cep: '02011000',
    status: 'inativo',
    cor: '#004E8F',
    credenciadoDesde: '2024-05-08',
    especialidades: especialidades('t8', 't5'),
    emAberto: 0,
    total: 0,
  }),
]

type LinhaPrevia = PreviaPlanilha['linhas'][number]
const linhaPrevia = (
  nome: string,
  documento: string,
  especialidades: string[],
  selo: LinhaPrevia['selo'],
): LinhaPrevia => ({
  nome,
  documento,
  especialidades,
  acao: selo === 'Novo' ? 'novo' : selo === 'Atualizar' ? 'atualizar' : 'erro',
  selo,
})

/** A prévia da planilha de exemplo dos casos visuais (tools/visual/fixtures/credenciados.csv). */
export const PREVIA_EXEMPLO: PreviaPlanilha = {
  linhas: [
    linhaPrevia(
      'Carlos Mendes',
      '318.402.117-50',
      ['Vazamento', 'Revisão elétrica', 'Ponto de luz'],
      'Atualizar',
    ),
    linhaPrevia('Ana Ribeiro', '27.415.903/0001-44', ['Pintura', 'Reparo em gesso'], 'Atualizar'),
    linhaPrevia('Pedro Lima', '529.982.247-25', ['Vazamento', 'Chaveiro'], 'Novo'),
    linhaPrevia(
      'Fernanda Souza',
      '11.222.333/0001-81',
      ['limpeza de ar condicionado', 'Jardinagem'],
      'Novo',
    ),
    linhaPrevia('Roberto Alves', '219.774.380-12', ['Chaveiro', 'Pintura'], 'Atualizar'),
    linhaPrevia('', '111.444.777-35', ['Pintura'], 'Sem nome'),
    linhaPrevia('Bruno Castro', '123.456.789', ['Vazamento'], 'Documento inválido'),
    linhaPrevia('Carlos M.', '318.402.117-50', ['Vazamento'], 'Duplicado na planilha'),
  ],
  resumo: { novos: 2, atualizados: 3, erros: 3 },
  ausentes: [
    { id: 'p3', nome: 'João Pires' },
    { id: 'p4', nome: 'Marina Costa' },
    { id: 'p6', nome: 'Luciana Prado' },
  ],
}

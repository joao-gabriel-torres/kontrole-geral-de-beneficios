import type { components } from '@kgb/api-client'

type PrestadorCadastro = components['schemas']['PrestadorCadastro']
type TipoDemanda = components['schemas']['TipoDemanda']

/** Dados de teste da tela de Prestadores (o seed do dia, no formato da API). */

const tipo = (id: string, nome: string, cor: string): TipoDemanda => ({
  id,
  nome,
  cor,
  checklist: [],
})

export const TIPOS_SEED: TipoDemanda[] = [
  tipo('t1', 'Vazamento', '#0069BD'),
  tipo('t2', 'Revisão elétrica', '#FC7608'),
  tipo('t3', 'Ponto de luz', '#5D627D'),
  tipo('t4', 'Troca de disjuntor', '#F47B50'),
  tipo('t5', 'Pintura', '#004E8F'),
  tipo('t6', 'Reparo em gesso', '#E0A100'),
  tipo('t7', 'Limpeza de ar-condicionado', '#8FB8DE'),
  tipo('t8', 'Chaveiro', '#A6A6A6'),
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
    status: 'ativo',
    cor: '#0069BD',
    credenciadoDesde: '2024-03-12',
    especialidades: especialidades('t1', 't2', 't3', 't4'),
    emAberto: 8,
    total: 20,
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
    status: 'inativo',
    cor: '#004E8F',
    credenciadoDesde: '2024-05-08',
    especialidades: especialidades('t8', 't5'),
    emAberto: 0,
    total: 0,
  }),
]

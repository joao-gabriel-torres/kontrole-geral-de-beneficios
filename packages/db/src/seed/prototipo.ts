import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface FotoPrototipo {
  id: string
  bg?: string
  src?: string
  stamp: string
}
export interface EtapaPrototipo {
  id: string
  text: string
  done: boolean
  photos: FotoPrototipo[]
  comment: string
}
export interface DemandaPrototipo {
  id: string
  typeId: string
  typeName: string
  color: string
  steps: EtapaPrototipo[]
}
export interface RevisaoPrototipo {
  d: 'a' | 'r'
  reason: string
  at: string
}
export type StatusPrototipo = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'aprovado'
export interface AcionamentoPrototipo {
  id: string
  code: string
  title: string
  client: string
  address: string
  date: string
  start: string
  end: string
  pid: string
  status: StatusPrototipo
  inviavel: boolean
  createdAt: string
  startedAt: string | null
  subs: string[]
  reviews: RevisaoPrototipo[]
  finalPhotos: FotoPrototipo[]
  finalComment: string
  inv: { comment: string; photos: FotoPrototipo[] } | null
  demandas: DemandaPrototipo[]
}
export interface PrestadorPrototipo {
  id: string
  name: string
  ini: string
  color: string
  doc: string
  phone: string
  email: string
  region: string
  types: string[]
  status: 'ativo' | 'inativo'
  since: string
  deleted: boolean
}
export interface TipoPrototipo {
  id: string
  name: string
  color: string
  checklist: string[]
}
export interface DadosPrototipo {
  v: number
  pros: PrestadorPrototipo[]
  types: TipoPrototipo[]
  acs: AcionamentoPrototipo[]
}

const ARQUIVO = fileURLToPath(
  new URL('../../../../docs/design/acionamentos-data.js', import.meta.url),
)

/** Executa o gerador de dados do protótipo (determinístico, datas relativas a hoje). */
export function carregarDadosPrototipo(): DadosPrototipo {
  const codigo = readFileSync(ARQUIVO, 'utf8')
  const janela: { ACD?: { seed: () => DadosPrototipo } } = {}
  new Function('window', codigo)(janela)
  if (!janela.ACD) throw new Error('acionamentos-data.js não definiu window.ACD')
  return janela.ACD.seed()
}

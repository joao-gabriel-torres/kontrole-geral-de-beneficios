import type { Prisma } from '@kgb/db'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import type { Regras } from '../dominio/acionamento'
import { naoEncontrado } from '../erros'
import { incluirDetalhe, incluirResumo, paraDetalhe, paraResumo } from './serializacao'

export type Db = Prisma.TransactionClient | typeof prisma
export type FiltroStatus = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'finalizados'

/** O que o usuário pode ver: tudo (gestor), os seus (prestador) ou nada (prestador sem vínculo). */
export function filtroVisivel(u: UsuarioSessao): Prisma.AcionamentoWhereInput | null {
  if (u.papel === 'gestor') return {}
  return u.prestadorId ? { prestadorId: u.prestadorId } : null
}

export async function regrasAtuais(db: Db = prisma): Promise<Regras> {
  const c = await db.configuracao.findUnique({ where: { id: 1 } })
  return { photoMin: c?.photoMin ?? 1, requireAllSteps: c?.requireAllSteps ?? false }
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export async function listarAcionamentos(
  u: UsuarioSessao,
  filtros: { status?: FiltroStatus; busca?: string },
) {
  const visivel = filtroVisivel(u)
  if (!visivel) return []
  const status = filtros.status === 'finalizados' ? 'aprovado' : filtros.status
  const lista = await prisma.acionamento.findMany({
    where: { ...visivel, ...(status ? { status } : {}) },
    include: incluirResumo,
    orderBy: [{ data: 'desc' }, { inicio: 'desc' }],
  })
  const resumos = lista.map(paraResumo)
  const termo = normalizar(filtros.busca ?? '')
  if (!termo) return resumos
  return resumos.filter((r) =>
    normalizar(`${r.titulo} ${r.cliente} ${r.codigo} ${r.prestador.nome}`).includes(termo),
  )
}

export async function detalharAcionamento(u: UsuarioSessao, id: string) {
  const visivel = filtroVisivel(u)
  if (!visivel) throw naoEncontrado()
  const a = await prisma.acionamento.findFirst({
    where: { id, ...visivel },
    include: incluirDetalhe,
  })
  if (!a) throw naoEncontrado()
  return paraDetalhe(a, await regrasAtuais())
}

export async function listarTipos() {
  return prisma.tipoDemanda.findMany({
    where: { excluidoEm: null },
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, cor: true, checklist: true },
  })
}

export async function listarPrestadoresAtivos() {
  return prisma.prestador.findMany({
    where: { status: 'ativo', excluidoEm: null },
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, regiao: true, cor: true },
  })
}

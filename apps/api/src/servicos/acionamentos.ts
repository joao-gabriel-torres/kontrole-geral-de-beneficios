import type { Prisma } from '@kgb/db'
import { armazenamento } from '../arquivos'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import {
  ErroDominio,
  normalizarNovoAcionamento,
  verificarRevisao,
  type DadosNovoAcionamento,
  type Decisao,
  type Regras,
  type StatusAcionamento,
} from '../dominio/acionamento'
import { naoEncontrado } from '../erros'
import {
  incluirDetalhe,
  incluirResumo,
  paraDetalhe,
  paraResumo,
  PREFIXO_PLACEHOLDER,
} from './serializacao'

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

export interface LinhaTravada {
  id: string
  status: StatusAcionamento
  prestadorId: string
  inviavel: boolean
  iniciadoEm: Date | null
}

/** Trava a linha do acionamento até o fim da transação: ações simultâneas ficam em fila. */
export async function travar(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<LinhaTravada | null> {
  const [linha] = await tx.$queryRaw<LinhaTravada[]>`
    SELECT id, status, "prestadorId", inviavel, "iniciadoEm" FROM acionamento WHERE id = ${id} FOR UPDATE`
  return linha ?? null
}

export async function removerArquivos(chaves: readonly string[]): Promise<void> {
  await Promise.all(
    chaves.filter((c) => !c.startsWith(PREFIXO_PLACEHOLDER)).map((c) => armazenamento.remover(c)),
  )
}

export async function criarAcionamento(u: UsuarioSessao, dados: DadosNovoAcionamento) {
  const d = normalizarNovoAcionamento(dados)
  const id = await prisma.$transaction(async (tx) => {
    const prestador = await tx.prestador.findFirst({
      where: { id: d.prestadorId, status: 'ativo', excluidoEm: null },
      select: { id: true },
    })
    if (!prestador) throw new ErroDominio('prestador_inativo', 'Escolha um prestador ativo')
    const tipos = await tx.tipoDemanda.findMany({
      where: { id: { in: d.tipoIds }, excluidoEm: null },
    })
    if (tipos.length !== d.tipoIds.length)
      throw new ErroDominio('tipo_invalido', 'Tipo de demanda inválido')
    const porId = new Map(tipos.map((t) => [t.id, t]))
    const criado = await tx.acionamento.create({
      data: {
        titulo: d.titulo,
        cliente: d.cliente,
        endereco: d.endereco,
        data: new Date(`${d.data}T00:00:00Z`),
        inicio: d.inicio,
        fim: d.fim,
        prestadorId: d.prestadorId,
        criadoPorId: u.id,
        demandas: {
          create: d.tipoIds.map((tipoId, ordem) => {
            const tipo = porId.get(tipoId)!
            return {
              tipoId,
              tipoNome: tipo.nome,
              cor: tipo.cor,
              ordem,
              etapas: { create: tipo.checklist.map((texto, i) => ({ ordem: i, texto })) },
            }
          }),
        },
        eventos: { create: { tipo: 'criado', autorId: u.id } },
      },
      select: { id: true },
    })
    return criado.id
  })
  return paraResumo(
    await prisma.acionamento.findUniqueOrThrow({ where: { id }, include: incluirResumo }),
  )
}

export async function revisarAcionamento(
  u: UsuarioSessao,
  id: string,
  entrada: { decisao: Decisao; motivo?: string },
) {
  const chavesApagadas = await prisma.$transaction(async (tx) => {
    const a = await travar(tx, id)
    if (!a) throw naoEncontrado()
    const motivo = verificarRevisao({
      status: a.status,
      decisao: entrada.decisao,
      motivo: entrada.motivo,
    })
    const agora = new Date()
    await tx.revisao.create({
      data: { acionamentoId: id, decisao: entrada.decisao, motivo, em: agora, gestorId: u.id },
    })
    const recusaInviabilidade = entrada.decisao === 'reprovado' && a.inviavel
    let chaves: string[] = []
    if (recusaInviabilidade) {
      const fotos = await tx.foto.findMany({
        where: { acionamentoId: id, contexto: 'inviabilidade' },
        select: { storageKey: true },
      })
      chaves = fotos.map((f) => f.storageKey)
      await tx.foto.deleteMany({ where: { acionamentoId: id, contexto: 'inviabilidade' } })
    }
    await tx.acionamento.update({
      where: { id },
      data: {
        status: entrada.decisao,
        ...(recusaInviabilidade ? { inviavel: false, inviabilidadeComentario: null } : {}),
        eventos: {
          create: {
            tipo: entrada.decisao,
            autorId: u.id,
            em: agora,
            ...(motivo ? { dados: { motivo } } : {}),
          },
        },
      },
    })
    return chaves
  })
  await removerArquivos(chavesApagadas)
  return detalharAcionamento(u, id)
}

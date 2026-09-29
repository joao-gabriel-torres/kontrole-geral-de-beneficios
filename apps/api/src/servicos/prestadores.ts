import type { Prisma } from '@kgb/db'
import { prisma } from '../db'
import { ErroDominio } from '../dominio/acionamento'
import { dataSP } from '../dominio/datas'
import { corDoPrestador } from '../dominio/documentos'
import {
  mensagemBloqueio,
  normalizarPrestador,
  ordenarPorNome,
  somarCarga,
  STATUS_EM_ABERTO,
  validarPrestador,
  type Carga,
  type DadosPrestador,
  type PrestadorNormalizado,
} from '../dominio/prestadores'
import { naoEncontrado } from '../erros'

type Db = Prisma.TransactionClient | typeof prisma
export type StatusPrestador = 'ativo' | 'inativo'

const incluirCadastro = {
  especialidades: {
    where: { tipo: { excluidoEm: null } },
    orderBy: { ordem: 'asc' },
    select: { tipo: { select: { id: true, nome: true } } },
  },
} satisfies Prisma.PrestadorInclude

type PrestadorComEspecialidades = Prisma.PrestadorGetPayload<{ include: typeof incluirCadastro }>

function paraCadastro(p: PrestadorComEspecialidades, carga: Carga = { emAberto: 0, total: 0 }) {
  return {
    id: p.id,
    nome: p.nome,
    documento: p.documento,
    telefone: p.telefone,
    email: p.email,
    regiao: p.regiao,
    status: p.status,
    cor: p.cor,
    credenciadoDesde: p.credenciadoDesde.toISOString().slice(0, 10),
    especialidades: p.especialidades.map((e) => e.tipo),
    emAberto: carga.emAberto,
    total: carga.total,
  }
}

export type PrestadorCadastro = ReturnType<typeof paraCadastro>

async function listar(where: Prisma.PrestadorWhereInput = {}): Promise<PrestadorCadastro[]> {
  const lista = await prisma.prestador.findMany({
    where: { ...where, excluidoEm: null },
    include: incluirCadastro,
  })
  const grupos = await prisma.acionamento.groupBy({
    by: ['prestadorId', 'status'],
    where: { prestadorId: { in: lista.map((p) => p.id) } },
    _count: { _all: true },
  })
  const carga = somarCarga(
    grupos.map((g) => ({
      prestadorId: g.prestadorId,
      status: g.status,
      quantidade: g._count._all,
    })),
  )
  return ordenarPorNome(lista.map((p) => paraCadastro(p, carga.get(p.id))))
}

/** A lista da tela de Prestadores: os não excluídos, por nome, com a carga de cada um. */
export const listarCadastro = () => listar()

async function cadastroDe(id: string): Promise<PrestadorCadastro> {
  const [p] = await listar({ id })
  if (!p) throw naoEncontrado('Prestador')
  return p
}

/** Nome de outro prestador não excluído com o mesmo documento. */
async function donoDoDocumento(documento: string, excetoId?: string): Promise<string | null> {
  const dono = await prisma.prestador.findFirst({
    where: { documento, excluidoEm: null, ...(excetoId ? { id: { not: excetoId } } : {}) },
    select: { nome: true },
  })
  return dono?.nome ?? null
}

async function exigirTipos(db: Db, ids: readonly string[]): Promise<void> {
  const existentes = await db.tipoDemanda.count({
    where: { id: { in: [...ids] }, excluidoEm: null },
  })
  if (existentes !== ids.length) throw new ErroDominio('tipo_invalido', 'Tipo de demanda inválido')
}

const ehDuplicado = (e: unknown) => (e as { code?: unknown } | null)?.code === 'P2002'

/** Corrida entre dois cadastros com o mesmo documento: o índice único parcial responde. */
async function comDocumentoUnico<T>(p: PrestadorNormalizado, gravar: () => Promise<T>) {
  try {
    return await gravar()
  } catch (e) {
    if (!ehDuplicado(e)) throw e
    const dono = await donoDoDocumento(p.documento)
    throw new ErroDominio(
      'documento_duplicado',
      dono ? `Documento já cadastrado para ${dono}` : 'Documento já cadastrado',
      409,
    )
  }
}

const vinculos = (especialidades: readonly string[]) =>
  especialidades.map((tipoId, ordem) => ({ tipoId, ordem }))

export async function criarPrestador(dados: DadosPrestador): Promise<PrestadorCadastro> {
  const p = normalizarPrestador(dados)
  validarPrestador(p, { donoDoDocumento: await donoDoDocumento(p.documento) })
  await exigirTipos(prisma, p.especialidades)
  const criado = await comDocumentoUnico(p, async () =>
    prisma.prestador.create({
      data: {
        nome: p.nome,
        documento: p.documento,
        telefone: p.telefone,
        email: p.email,
        regiao: p.regiao,
        status: 'ativo',
        // A cor segue a posição do cadastro, contando os excluídos (PCOL[d.pros.length % 8]).
        cor: corDoPrestador(await prisma.prestador.count()),
        credenciadoDesde: new Date(`${dataSP(new Date())}T00:00:00Z`),
        especialidades: { create: vinculos(p.especialidades) },
      },
      select: { id: true },
    }),
  )
  return cadastroDe(criado.id)
}

async function exigirNaoExcluido(id: string) {
  const atual = await prisma.prestador.findFirst({
    where: { id, excluidoEm: null },
    select: { documento: true },
  })
  if (!atual) throw naoEncontrado('Prestador')
  return atual
}

/** Edita os dados do cadastro. Status, cor e data de credenciamento ficam como estão. */
export async function atualizarPrestador(
  id: string,
  dados: DadosPrestador,
): Promise<PrestadorCadastro> {
  const atual = await exigirNaoExcluido(id)
  const p = normalizarPrestador(dados)
  validarPrestador(p, {
    documentoAtual: atual.documento,
    donoDoDocumento: await donoDoDocumento(p.documento, id),
  })
  await comDocumentoUnico(p, () =>
    prisma.$transaction(async (tx) => {
      await exigirTipos(tx, p.especialidades)
      await tx.prestador.update({
        where: { id },
        data: {
          nome: p.nome,
          documento: p.documento,
          telefone: p.telefone,
          email: p.email,
          regiao: p.regiao,
        },
      })
      await tx.prestadorEspecialidade.deleteMany({ where: { prestadorId: id } })
      await tx.prestadorEspecialidade.createMany({
        data: vinculos(p.especialidades).map((v) => ({ ...v, prestadorId: id })),
      })
    }),
  )
  return cadastroDe(id)
}

/**
 * O switch e o "Desativar": sem confirmação, como no protótipo. O inativo sai da escolha do Novo
 * acionamento, mas continua entrando e conclui o que já tem.
 */
export async function alterarStatus(
  id: string,
  status: StatusPrestador,
): Promise<PrestadorCadastro> {
  const { count } = await prisma.prestador.updateMany({
    where: { id, excluidoEm: null },
    data: { status },
  })
  if (count === 0) throw naoEncontrado('Prestador')
  return cadastroDe(id)
}

/**
 * Exclusão lógica. Recusa quem tem acionamentos em aberto; senão marca `excluidoEm`, desativa e
 * derruba as sessões do login vinculado (o excluído não entra mais).
 */
export async function excluirPrestador(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // A trava põe em fila com um acionamento sendo criado para o mesmo prestador (a chave
    // estrangeira do INSERT disputa esta linha).
    const [p] = await tx.$queryRaw<{ nome: string }[]>`
      SELECT nome FROM prestador WHERE id = ${id} AND "excluidoEm" IS NULL FOR UPDATE`
    if (!p) throw naoEncontrado('Prestador')
    const emAberto = await tx.acionamento.count({
      where: { prestadorId: id, status: { in: [...STATUS_EM_ABERTO] } },
    })
    if (emAberto > 0) {
      throw new ErroDominio('prestador_com_acionamentos', mensagemBloqueio(p.nome, emAberto), 409)
    }
    await tx.prestador.update({
      where: { id },
      data: { excluidoEm: new Date(), status: 'inativo' },
    })
    await tx.session.deleteMany({ where: { user: { prestadorId: id } } })
  })
}

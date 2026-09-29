import type { Prisma } from '@kgb/db'
import { prisma } from '../db'
import {
  corDoNovoTipo,
  exigirNomeLivre,
  exigirOutroTipoAtivo,
  normalizarChecklist,
  normalizarNomeTipo,
} from '../dominio/tipos'
import { naoEncontrado } from '../erros'

const CAMPOS = { id: true, nome: true, cor: true, checklist: true } as const

/**
 * Põe em fila as escritas nos tipos até o fim da transação e devolve os tipos não excluídos. Assim
 * o nome único (sem acentos e sem maiúsculas), a cor pela quantidade e o "pelo menos um tipo"
 * valem mesmo com pedidos simultâneos.
 */
async function travarTipos(tx: Prisma.TransactionClient): Promise<{ id: string; nome: string }[]> {
  await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext('tipo_demanda'))`
  return tx.tipoDemanda.findMany({ where: { excluidoEm: null }, select: { id: true, nome: true } })
}

export async function criarTipo(dados: { nome: string }) {
  const nome = normalizarNomeTipo(dados.nome)
  return prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    exigirNomeLivre(nome, ativos)
    return tx.tipoDemanda.create({
      data: { nome, cor: corDoNovoTipo(ativos.length), checklist: [] },
      select: CAMPOS,
    })
  })
}

/** `checklist` é a lista inteira: editar, subir, remover e adicionar etapas são todos este PATCH. */
export async function atualizarTipo(id: string, dados: { nome?: string; checklist?: string[] }) {
  const nome = dados.nome === undefined ? undefined : normalizarNomeTipo(dados.nome)
  const checklist = dados.checklist === undefined ? undefined : normalizarChecklist(dados.checklist)
  return prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    if (!ativos.some((t) => t.id === id)) throw naoEncontrado('Tipo de demanda')
    if (nome !== undefined) exigirNomeLivre(nome, ativos, id)
    return tx.tipoDemanda.update({ where: { id }, data: { nome, checklist }, select: CAMPOS })
  })
}

/**
 * Exclusão lógica. Os vínculos de especialidade saem; os acionamentos guardam a cópia do checklist
 * (nome, cor e etapas) e não mudam.
 */
export async function excluirTipo(id: string): Promise<{ ok: true }> {
  await prisma.$transaction(async (tx) => {
    const ativos = await travarTipos(tx)
    if (!ativos.some((t) => t.id === id)) throw naoEncontrado('Tipo de demanda')
    exigirOutroTipoAtivo(ativos.length)
    await tx.prestadorEspecialidade.deleteMany({ where: { tipoId: id } })
    await tx.tipoDemanda.update({ where: { id }, data: { excluidoEm: new Date() } })
  })
  return { ok: true }
}

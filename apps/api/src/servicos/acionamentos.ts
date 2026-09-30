import { randomUUID } from 'node:crypto'
import type { Prisma } from '@kgb/db'
import { armazenamento } from '../arquivos'
import { detectarTipoImagem, TAMANHO_MAXIMO_FOTO, type TipoImagem } from '../arquivos/imagem'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import {
  ErroDominio,
  exigirStatus,
  normalizarNovoAcionamento,
  verificarEnvio,
  verificarInviabilidade,
  verificarRevisao,
  type DadosNovoAcionamento,
  type Decisao,
  type Regras,
  type StatusAcionamento,
} from '../dominio/acionamento'
import { normalizarCepOpcional } from '../dominio/cep'
import { dataSP } from '../dominio/datas'
import { calcularInicio } from '../dominio/inicio-prestador'
import { ordenarPorProximidade } from '../dominio/proximidade'
import { ErroHttp, naoEncontrado } from '../erros'
import {
  incluirDetalhe,
  incluirResumo,
  paraDetalhe,
  paraFoto,
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
    select: { id: true, nome: true, cor: true, categoria: true, checklist: true },
  })
}

/** Ativos na ordem do cadastro; com um CEP de referência, do mais próximo para o mais distante. */
export async function listarPrestadoresAtivos(cepDeReferencia?: string) {
  const ativos = await prisma.prestador.findMany({
    where: { status: 'ativo', excluidoEm: null },
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, regiao: true, cep: true, cor: true },
  })
  return cepDeReferencia ? ordenarPorProximidade(ativos, cepDeReferencia) : ativos
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

/**
 * Apaga os arquivos em melhor esforço: roda depois do commit ou para desfazer um envio, e uma falha
 * do armazenamento não pode virar erro de uma ação já gravada nem trocar o erro original. Cada
 * falha fica no log.
 */
export async function removerArquivos(chaves: readonly string[]): Promise<void> {
  const reais = chaves.filter((c) => !c.startsWith(PREFIXO_PLACEHOLDER))
  const resultados = await Promise.allSettled(reais.map((c) => armazenamento.remover(c)))
  resultados.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error('Não foi possível remover o arquivo', reais[i], r.reason)
    }
  })
}

export async function criarAcionamento(u: UsuarioSessao, dados: DadosNovoAcionamento) {
  const d = normalizarNovoAcionamento(dados)
  const cep = normalizarCepOpcional(d.cep)
  const assinanteId = d.assinanteId?.trim() || null
  const id = await prisma.$transaction(async (tx) => {
    // FOR SHARE segura o prestador até o INSERT: uma exclusão ou desativação em andamento termina
    // antes, e a condição é conferida de novo na linha já gravada (o excluído não recebe nada).
    // Uma exclusão que chega depois espera esta transação e já conta o acionamento novo.
    const [prestador] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM prestador
      WHERE id = ${d.prestadorId} AND status = 'ativo' AND "excluidoEm" IS NULL
      FOR SHARE`
    if (!prestador) throw new ErroDominio('prestador_inativo', 'Escolha um prestador ativo')
    if (assinanteId) {
      const assinante = await tx.assinante.findFirst({
        where: { id: assinanteId, status: 'ativo', excluidoEm: null },
        select: { id: true },
      })
      if (!assinante) throw new ErroDominio('assinante_invalido', 'Escolha um assinante ativo')
    }
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
        assinanteId,
        cep,
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

export const MAX_FOTOS_INVIABILIDADE = 5

async function travarDoPrestador(tx: Prisma.TransactionClient, u: UsuarioSessao, id: string) {
  const a = await travar(tx, id)
  if (!a || !u.prestadorId || a.prestadorId !== u.prestadorId) throw naoEncontrado()
  return a
}

async function lerImagem(arquivo: unknown): Promise<{ dados: Uint8Array; tipo: TipoImagem }> {
  if (!(arquivo instanceof File)) throw new ErroHttp(422, 'arquivo_obrigatorio', 'Envie a foto')
  if (arquivo.size > TAMANHO_MAXIMO_FOTO)
    throw new ErroHttp(413, 'arquivo_grande', 'A foto passa de 10 MB')
  const dados = new Uint8Array(await arquivo.arrayBuffer())
  const tipo = detectarTipoImagem(dados)
  if (!tipo)
    throw new ErroHttp(415, 'tipo_arquivo_invalido', 'Envie uma foto em JPEG, PNG, WebP ou HEIC')
  return { dados, tipo }
}

export async function iniciarAtendimento(u: UsuarioSessao, id: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('iniciar', a.status)
    await tx.acionamento.update({
      where: { id },
      data: {
        status: 'em_andamento',
        iniciadoEm: new Date(),
        eventos: { create: { tipo: 'iniciado', autorId: u.id } },
      },
    })
  })
  return detalharAcionamento(u, id)
}

export async function atualizarEtapa(
  u: UsuarioSessao,
  id: string,
  etapaId: string,
  dados: { feita?: boolean; comentario?: string },
) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    const r = await tx.etapa.updateMany({
      where: { id: etapaId, demanda: { acionamentoId: id } },
      data: {
        ...(dados.feita !== undefined ? { feita: dados.feita } : {}),
        ...(dados.comentario !== undefined
          ? { comentario: dados.comentario.trim() ? dados.comentario : null }
          : {}),
      },
    })
    if (r.count === 0) throw naoEncontrado('Etapa')
  })
  return detalharAcionamento(u, id)
}

export async function atualizarConclusao(u: UsuarioSessao, id: string, comentario: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    await tx.acionamento.update({
      where: { id },
      data: { comentarioConclusao: comentario.trim() ? comentario : null },
    })
  })
  return detalharAcionamento(u, id)
}

export async function adicionarFoto(
  u: UsuarioSessao,
  id: string,
  entrada: {
    arquivo: unknown
    contexto: 'etapa' | 'conclusao'
    etapaId?: string
    tiradaEm?: string
  },
) {
  const { dados, tipo } = await lerImagem(entrada.arquivo)
  if (entrada.contexto === 'etapa' && !entrada.etapaId) {
    throw new ErroHttp(422, 'etapa_obrigatoria', 'Informe a etapa da foto')
  }
  const fotoId = randomUUID()
  // A chave só existe depois de travar a linha, e usa o id dela: um id malformado na URL cai no
  // 404 sem nunca virar caminho de arquivo.
  let chave: string | null = null
  try {
    const foto = await prisma.$transaction(async (tx) => {
      const a = await travarDoPrestador(tx, u, id)
      exigirStatus('editar', a.status)
      if (entrada.contexto === 'etapa') {
        const etapa = await tx.etapa.findFirst({
          where: { id: entrada.etapaId, demanda: { acionamentoId: a.id } },
          select: { id: true },
        })
        if (!etapa) throw naoEncontrado('Etapa')
      }
      chave = `${a.id}/${fotoId}.${tipo.extensao}`
      await armazenamento.salvar(chave, dados, tipo.mime)
      return tx.foto.create({
        data: {
          id: fotoId,
          acionamentoId: a.id,
          contexto: entrada.contexto,
          etapaId: entrada.contexto === 'etapa' ? entrada.etapaId! : null,
          storageKey: chave,
          tiradaEm: entrada.tiradaEm ? new Date(entrada.tiradaEm) : new Date(),
        },
      })
    })
    return paraFoto(foto)
  } catch (erro) {
    if (chave) await removerArquivos([chave])
    throw erro
  }
}

export async function removerFoto(u: UsuarioSessao, id: string, fotoId: string) {
  const chave = await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    const foto = await tx.foto.findFirst({
      where: { id: fotoId, acionamentoId: id, contexto: { in: ['etapa', 'conclusao'] } },
      select: { storageKey: true },
    })
    if (!foto) throw naoEncontrado('Foto')
    await tx.foto.delete({ where: { id: fotoId } })
    return foto.storageKey
  })
  await removerArquivos([chave])
}

export async function enviarParaAprovacao(u: UsuarioSessao, id: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    const fotosConclusao = await tx.foto.count({
      where: { acionamentoId: id, contexto: 'conclusao' },
    })
    const etapas = await tx.etapa.findMany({
      where: { demanda: { acionamentoId: id } },
      select: { feita: true },
    })
    verificarEnvio({ status: a.status, fotosConclusao, etapas, regras: await regrasAtuais(tx) })
    await tx.acionamento.update({
      where: { id },
      data: { status: 'aguardando', eventos: { create: { tipo: 'enviado', autorId: u.id } } },
    })
  })
  return detalharAcionamento(u, id)
}

export async function marcarInviavel(
  u: UsuarioSessao,
  id: string,
  entrada: { comentario: string; arquivos: unknown[] },
) {
  if (entrada.arquivos.length > MAX_FOTOS_INVIABILIDADE) {
    throw new ErroHttp(422, 'fotos_demais', `Envie no máximo ${MAX_FOTOS_INVIABILIDADE} fotos`)
  }
  const imagens = await Promise.all(entrada.arquivos.map(lerImagem))
  const chaves: string[] = []
  try {
    await prisma.$transaction(async (tx) => {
      const a = await travarDoPrestador(tx, u, id)
      const comentario = verificarInviabilidade({
        status: a.status,
        comentario: entrada.comentario,
        fotos: imagens.length,
      })
      const agora = new Date()
      for (const imagem of imagens) {
        const fotoId = randomUUID()
        const chave = `${a.id}/${fotoId}.${imagem.tipo.extensao}`
        chaves.push(chave)
        await armazenamento.salvar(chave, imagem.dados, imagem.tipo.mime)
        await tx.foto.create({
          data: {
            id: fotoId,
            acionamentoId: a.id,
            contexto: 'inviabilidade',
            storageKey: chave,
            tiradaEm: agora,
          },
        })
      }
      await tx.acionamento.update({
        where: { id },
        data: {
          status: 'aguardando',
          inviavel: true,
          inviabilidadeComentario: comentario,
          iniciadoEm: a.iniciadoEm ?? agora,
          eventos: {
            create: [
              ...(a.iniciadoEm ? [] : [{ tipo: 'iniciado' as const, autorId: u.id, em: agora }]),
              {
                tipo: 'inviabilidade_enviada' as const,
                autorId: u.id,
                em: new Date(agora.getTime() + 1),
              },
            ],
          },
        },
      })
    })
  } catch (erro) {
    await removerArquivos(chaves)
    throw erro
  }
  return detalharAcionamento(u, id)
}

export async function inicioDoPrestador(u: UsuarioSessao) {
  const vazio = {
    proximo: null,
    hoje: [],
    metricas: { hoje: 0, noMes: 0, aprovacao: { taxa: 0, dePrimeira: null }, paraCorrigir: 0 },
    rotaDoDia: [],
  }
  if (!u.prestadorId) return vazio
  const lista = await prisma.acionamento.findMany({
    where: { prestadorId: u.prestadorId },
    include: { ...incluirResumo, revisoes: { orderBy: { em: 'asc' }, select: { decisao: true } } },
  })
  const resumos = new Map(lista.map((a) => [a.id, paraResumo(a)]))
  const calculo = calcularInicio(
    lista.map((a) => ({
      id: a.id,
      data: a.data.toISOString().slice(0, 10),
      inicio: a.inicio,
      status: a.status,
      inviavel: a.inviavel,
      endereco: a.endereco,
      revisoes: a.revisoes.map((r) => r.decisao),
    })),
    dataSP(new Date()),
  )
  return {
    proximo: calculo.proximoId ? resumos.get(calculo.proximoId)! : null,
    hoje: calculo.hojeIds.map((id) => resumos.get(id)!),
    metricas: calculo.metricas,
    rotaDoDia: calculo.rotaDoDia,
  }
}
